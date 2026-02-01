// Load environment variables
require('dotenv').config();

const express = require('express')
const crypto = require("node:crypto");
const path = require('path');
const mongoose = require('mongoose');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server')
const cbor = require('cbor');
const {
    Keypair,
    TransactionBuilder,
    BASE_FEE,
    rpc,
    Contract,
    Operation,
    xdr,
    StrKey,
    Address
} = require('@stellar/stellar-sdk')
const https = require('https');

const fs = require('fs');

if (!globalThis.crypto) {
    globalThis.crypto = crypto;
}

const PORT = process.env.PORT || 3000;
const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = process.env.RP_NAME || 'My Localhost Machine';
const ORIGIN = process.env.ORIGIN || `http://localhost:${PORT}`;
const VITE_ORIGIN = process.env.VITE_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/passkey';
// Default to testnet for development
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const RPC_URL = process.env.RPC_URL || 'https://soroban-testnet.stellar.org';
const DEPLOYER_SECRET = process.env.SOURCE_SECRET; // server-side signer for deploy
const CHILD_WASM_PATH = process.env.CHILD_WASM_PATH || path.join(__dirname, './wasm/hello_world.wasm');

// Contract Addresses (testnet by default)
// USDC on testnet: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
const FACTORY_CONTRACT_ID = process.env.FACTORY_CONTRACT_ID || '';
const CHILD_WASM_HASH = process.env.CHILD_WASM_HASH || '';

// Horizon API for transaction history (Testnet)
const HORIZON_URL = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
// USDC Issuer on Testnet (Classic Stellar)
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
// USDC Token Contract on Testnet (Soroban)
const USDC_CONTRACT = process.env.USDC_CONTRACT || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

// Get local IP address for mobile access
const os = require('os');
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}
const LOCAL_IP = getLocalIP();

const app = express();

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json())

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Import MongoDB Models
const User = require('./models/User');
const Challenge = require('./models/Challenge');
const Credential = require('./models/Credential');
const Transaction = require('./models/Transaction');
const SupportTicket = require('./models/SupportTicket');

// Soroban RPC client (used for contract deploy via SDK)
const rpcServer = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });

const allowedOrigins = [
    'https://vaulton-backend-f8c2dge3b7fwfch6.centralindia-01.azurewebsites.net',
    ORIGIN,
    VITE_ORIGIN,
    `https://${LOCAL_IP}`,
    `http://localhost`,
    `http://${LOCAL_IP}:${PORT}`,
    `http://${LOCAL_IP}:5173`,
    `https://${LOCAL_IP}:${PORT}`,
    `https://${LOCAL_IP}:5173`,
    // Common localhost variants
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:5173',
    // Add ngrok or other tunnel origins if set
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

app.get('/health', (req, res) => {
    res.json({
        message: 'OK', envVariables: {
            MONGODB_URI,
            RPC_URL,
            DEPLOYER_SECRET,
            FACTORY_CONTRACT_ID,
            CHILD_WASM_HASH,
            LOCAL_IP,
            ORIGIN,
            VITE_ORIGIN,
            ALLOWED_ORIGINS: allowedOrigins
        }
    });
})
// Endpoint to get user info
app.get('/user-info', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            userId: user.userId,
            name: user.name || null,
            hasPasskey: !!user.passkey,
            smartAccountId: user.smartAccountId || null,
            passkeyPubkey: user.passkeyPubkey || null,
            createdAt: user.createdAt
        });
    } catch (err) {
        console.error('Error fetching user info:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
})

// Endpoint to update user name after passkey registration
app.post('/update-name', async (req, res) => {
    const { userId, name } = req.body

    if (!userId || !name) {
        return res.status(400).json({ error: 'User ID and name are required' });
    }

    try {
        const user = await User.findOneAndUpdate(
            { userId },
            { name: name.trim() },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`Updated name for user ${userId}: ${name}`);

        return res.json({ success: true, userId, name: user.name });
    } catch (err) {
        console.error('Error updating user name:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
})

app.post('/register-challenge', async (req, res) => {
    // Generate a temporary user ID for this registration
    // The actual user will be created during verification
    try {

        const timestamp = Date.now().toString(36);
        const tempUserId = `temp_${timestamp}`;

        // Generate a unique username for WebAuthn (required by spec)
        const userName = `rise_stellar_hackathon_${timestamp}`;

        const challengePayload = await generateRegistrationOptions({
            rpID: RP_ID,
            rpName: RP_NAME,
            attestationType: 'none',
            userName: userName,
            userDisplayName: 'New User', // Will be updated after name is provided
            timeout: 120_000, // Increased timeout for mobile devices and QR code scanning
            authenticatorSelection: {
                authenticatorAttachment: undefined, // undefined = allow both platform and cross-platform
                userVerification: 'preferred',
                residentKey: 'required', // Enable discoverable credentials for mobile
                requireResidentKey: true,
            },
            supportedAlgorithmIDs: [-8, -7, -257], // Ed25519, ES256, and RS256
            excludeCredentials: [],
        })
        console.log('registerd key:', challengePayload?.user?.name);
        // Store challenge in MongoDB with temp userId
        try {
            // Store challenge with tempUserId as key
            await Challenge.create({
                key: tempUserId,
                challenge: challengePayload.challenge,
                tempUserId,
                userName: challengePayload?.user?.name
            });

            console.log(`Stored registration challenge for tempUserId: ${tempUserId}`);
        } catch (err) {
            console.error('Error storing challenge:', err);
            return res.status(500).json({ error: 'Failed to store challenge' });
        }

        return res.json({ options: challengePayload, tempUserId })
    }
    catch (err) {
        console.error('Error generating registration challenge:', err);
        return res.status(500).json({ error: 'Failed to generate registration challenge' });
    }

})

app.post('/register-verify', async (req, res) => {
    const { cred, tempUserId } = req.body
    try {

        if (!cred) {
            return res.status(400).json({ error: 'Credential data is required' });
        }

        if (!tempUserId) {
            return res.status(400).json({ error: 'tempUserId is required' });
        }

        // Get challenge from MongoDB using tempUserId
        let challengeDoc;
        try {
            challengeDoc = await Challenge.findOne({ key: tempUserId });
            if (!challengeDoc) {
                return res.status(400).json({ error: 'No pending registration found. Please start registration again.' });
            }
        } catch (err) {
            console.error('Error retrieving challenge:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const challenge = challengeDoc.challenge;
        const userName = challengeDoc.userName;

        // Support multiple origins for mobile and desktop access

        const origin = req.headers.origin || ORIGIN;
        const expectedOrigin = allowedOrigins.includes(origin) ? origin : ORIGIN;

        console.log(`Registration verification - Origin: ${origin}, Expected: ${expectedOrigin}`);

        const verificationResult = await verifyRegistrationResponse({
            expectedChallenge: challenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: RP_ID,
            response: cred,
            requireUserVerification: false, // For auto-register support
        })

        if (!verificationResult.verified) {
            console.error('Registration verification failed:', verificationResult);
            // Clean up challenge
            await Challenge.deleteOne({ key: tempUserId }).catch(err => console.error('Error deleting challenge:', err));
            return res.json({ error: 'could not verify registration' });
        }

        const registrationInfo = verificationResult.registrationInfo;
        if (!registrationInfo) {
            await Challenge.deleteOne({ key: tempUserId }).catch(err => console.error('Error deleting challenge:', err));
            return res.json({ error: 'No registration info returned' });
        }

        // Extract the 65-byte uncompressed secp256r1 pubkey (base64/base64url)
        let passkeyPubkey = null;
        try {
            const cose = Buffer.from(registrationInfo.credentialPublicKey);
            const decoded = cbor.decodeFirstSync(cose);
            const x = Buffer.from(decoded.get(-2)); // 32 bytes
            const y = Buffer.from(decoded.get(-3)); // 32 bytes
            const uncompressed = Buffer.concat([Buffer.from([0x04]), x, y]); // 65 bytes
            passkeyPubkey = uncompressed.toString('base64');
            console.log('Passkey pubkey (base64):', passkeyPubkey);
        } catch (e) {
            console.error('Failed to extract pubkey from registrationInfo:', e);
        }

        // Create new user with passkey
        // Generate a friendly user ID
        const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
        // const userId = `rise_stellar_hackathon_${timestamp}`;
        const userId = userName;

        try {
            // Create user in MongoDB
            // Ensure Buffer fields are strictly Buffers, not Uint8Arrays
            const cleanPasskey = {
                ...registrationInfo,
                credentialID: Buffer.from(registrationInfo.credentialID),
                credentialPublicKey: Buffer.from(registrationInfo.credentialPublicKey)
            };

            const newUser = await User.create({
                userId,
                name: null,
                passkey: cleanPasskey,
                passkeyPubkey: passkeyPubkey,
                smartAccountId: null,
                createdAt: new Date()
            });

            // Store credential ID mapping for discoverable credentials
            if (registrationInfo.credentialID) {
                // Convert Buffer to base64url for storage and lookup
                const credIdBase64 = Buffer.from(registrationInfo.credentialID).toString('base64url');

                await Credential.create({
                    credentialId: credIdBase64,
                    userId
                });

                console.log(`✅ Registered passkey for user ${userId}`);
                console.log(`   Credential ID (base64url): ${credIdBase64}`);
                console.log(`   Credential ID length: ${credIdBase64.length}`);

                const totalCreds = await Credential.countDocuments();
                console.log(`   Total registered credentials: ${totalCreds}`);
            } else {
                console.warn('⚠️  Warning: No credential ID in registration info');
                console.log('Registration info keys:', Object.keys(registrationInfo || {}));
            }

            // Clean up challenge
            await Challenge.deleteOne({ key: tempUserId });

            return res.json({ verified: true, userId })
        } catch (err) {
            console.error('Error creating user or credential:', err);
            return res.status(500).json({ error: 'Failed to create user' });
        }
    }
    catch (err) {
        console.error('Error creating user or credential:', err);
        // Clean up challenge on error
        return res.status(500).json({ error: 'Failed to create user' });
    }
    finally {
        // Clean up challenge
        await Challenge.deleteOne({ key: tempUserId }).catch(e => console.error('Error cleanup:', e)).catch(err => console.error('Error deleting challenge:', err));
    }

})

app.post('/login-challenge', async (req, res) => {
    // Only support discoverable credentials (no userId needed)
    // This allows users to login with just their passkey
    const opts = await generateAuthenticationOptions({
        rpID: RP_ID,
        timeout: 120_000, // Increased timeout for mobile devices and QR code scanning
        allowCredentials: undefined, // undefined = discoverable credentials only
        userVerification: 'preferred',
    })

    // Store challenge for discoverable credentials in MongoDB
    const challengeId = `discoverable-${Date.now()}`;
    try {
        await Challenge.create({
            key: challengeId,
            challenge: opts.challenge
        });
        console.log('Stored login challenge for discoverable credentials');
    } catch (err) {
        console.error('Error storing login challenge:', err);
        return res.status(500).json({ error: 'Failed to store challenge' });
    }

    return res.json({ options: opts, challengeId })
})


app.post('/login-verify', async (req, res) => {
    const { cred, challengeId } = req.body

    if (!cred) {
        return res.status(400).json({ error: 'Invalid credential data' });
    }

    console.log('Authentication response structure:');
    console.log('  - cred.id:', cred.id?.substring(0, 50) + '...');
    console.log('  - cred.rawId:', cred.rawId ? 'present' : 'missing');
    console.log('  - cred keys:', Object.keys(cred));

    const credentialId = cred.id || (cred.rawId ? Buffer.from(cred.rawId, 'base64').toString('base64url') : null);

    if (!credentialId) {
        return res.status(400).json({ error: 'Credential ID not found in response' });
    }

    let actualUserId = null;
    let user = null;
    let challenge = null;

    console.log('Attempting discoverable credential login');
    console.log('Credential ID from response:', credentialId?.substring(0, 30) + '...');
    console.log('Credential ID length:', credentialId?.length);

    try {
        const credMapping = await Credential.findOne({ credentialId });
        if (credMapping) {
            actualUserId = credMapping.userId;
            console.log(`✅ Found user ${actualUserId} in credential mapping`);
        }
        else {
            console.log(`cred mapping: ${credMapping}`);
            console.log(`Credential not found in mapping, searching all users... for ${credentialId}`);
        }
    } catch (err) {
        console.error('Error looking up credential:', err);
    }

    if (!actualUserId) {
        console.log(`Credential not found in mapping, searching all users... for ${credentialId}`);

        try {
            const allUsers = await User.find({});
            console.log(`Searching through ${allUsers.length} users`);

            for (const userData of allUsers) {
                if (userData.passkey && userData.passkey.credentialID) {
                    try {
                        const storedCredId = Buffer.from(userData.passkey.credentialID).toString('base64url');
                        console.log(`Comparing with user ${userData.userId}: ${storedCredId.substring(0, 30)}...`);

                        if (storedCredId === credentialId) {
                            actualUserId = userData.userId;
                            await Credential.create({ credentialId, userId: actualUserId }).catch(e => console.error('Error creating credential mapping:', e));
                            console.log(`✅ Found user ${userData.userId} by credential ID match!`);
                            break;
                        }
                    } catch (err) {
                        console.error('Error comparing credential IDs:', err);
                    }
                }
            }
        } catch (err) {
            console.error('Error searching users:', err);
        }
    }

    if (actualUserId) {
        user = await User.findOne({ userId: actualUserId });
    }

    if (!actualUserId || !user) {
        console.log('⚠️  Credential ID not found, attempting verification with all registered passkeys...');

        try {
            const challengeDoc = await Challenge.findOne({ key: challengeId });
            if (!challengeDoc) {
                return res.status(400).json({ error: 'Challenge not found. Please try logging in again.' });
            }
            challenge = challengeDoc.challenge;
        } catch (err) {
            console.error('Error retrieving challenge:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        const origin = req.headers.origin || ORIGIN;
        const expectedOrigin = allowedOrigins.includes(origin) ? origin : ORIGIN;

        try {
            const allUsers = await User.find({});
            for (const userData of allUsers) {
                if (userData.passkey) {
                    try {
                        const result = await verifyAuthenticationResponse({
                            expectedChallenge: challenge,
                            expectedOrigin: expectedOrigin,
                            expectedRPID: RP_ID,
                            response: cred,
                            authenticator: userData.passkey,
                            requireUserVerification: false,
                        });

                        if (result.verified) {
                            actualUserId = userData.userId;
                            user = userData;
                            await Credential.create({ credentialId, userId: actualUserId }).catch(e => console.error('Error creating credential mapping:', e));
                            console.log(`✅ Found user ${userData.userId} by verification!`);
                            break;
                        }
                    } catch (err) {
                        continue;
                    }
                }
            }
        } catch (err) {
            console.error('Error during fallback verification:', err);
        }

        if (!actualUserId || !user) {
            console.error('❌ User not found for credential ID:', credentialId?.substring(0, 30) + '...');
            const totalCreds = await Credential.countDocuments();
            const totalUsers = await User.countDocuments();
            console.log('Available credential mappings:', totalCreds);
            console.log('Total users:', totalUsers);
            return res.status(404).json({
                error: 'No passkey found. Please make sure you have registered a passkey first.',
                hint: 'Try registering a passkey on your profile page after signing up.'
            });
        }
    }

    if (!challenge) {
        try {
            const challengeDoc = await Challenge.findOne({ key: challengeId });
            if (!challengeDoc) {
                return res.status(400).json({ error: 'Challenge not found. Please try logging in again.' });
            }
            challenge = challengeDoc.challenge;
        } catch (err) {
            console.error('Error retrieving challenge:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    if (!user.passkey) {
        return res.status(400).json({ error: 'User has no registered passkey' });
    }

    const origin = req.headers.origin || ORIGIN;
    const expectedOrigin = allowedOrigins.includes(origin) ? origin : ORIGIN;

    console.log(`Authentication verification - Origin: ${origin}, Expected: ${expectedOrigin}`);

    const result = await verifyAuthenticationResponse({
        expectedChallenge: challenge,
        expectedOrigin: expectedOrigin,
        expectedRPID: RP_ID,
        response: cred,
        authenticator: user.passkey,
        requireUserVerification: false,
    })

    if (!result.verified) return res.json({ error: 'something went wrong' })

    await Challenge.deleteOne({ key: challengeId }).catch(err => console.error('Error deleting challenge:', err));

    return res.json({ success: true, userId: actualUserId })
})


// Deploy child contract via Stellar SDK using passkey keyId as salt
// Now passes passkey pubkey as constructor arg (no separate init needed)
// Expects: factoryId, wasmHash (hex), keyId (base64url), passkeyPubkey (base64/base64url, 65 bytes)
app.post('/deploy-child', async (req, res) => {
    try {
        if (!DEPLOYER_SECRET) {
            return res.status(400).json({ error: 'SOURCE_SECRET env is required on server to sign deploy tx' });
        }

        const { factoryId, wasmHash, keyId, passkeyPubkey, userId, challengeId } = req.body || {};
        if (!factoryId || !wasmHash || !keyId || !passkeyPubkey) {
            return res.status(400).json({ error: 'factoryId, wasmHash, keyId, and passkeyPubkey are required' });
        }

        // Check if user already has a smart account
        // Check if user already has a smart account
        if (userId) {
            try {
                const user = await User.findOne({ userId });
                if (user && user.smartAccountId) {
                    console.log(`User ${userId} already has smart account: ${user.smartAccountId}`);
                    return res.json({
                        existingChildId: user.smartAccountId,
                        message: 'User already has a smart account'
                    });
                }
            } catch (err) {
                console.error('Error checking user smart account:', err);
                // Continue with deployment if check fails or treat as error depending on requirement
                // For now, we continue but log error
            }
        }

        // Parse passkey pubkey (65-byte uncompressed secp256r1)
        let pubBytes;
        try {
            pubBytes = Buffer.from(passkeyPubkey, 'base64');
        } catch (_) {
            try {
                pubBytes = Buffer.from(passkeyPubkey, 'base64url');
            } catch (e) {
                return res.status(400).json({ error: 'passkeyPubkey must be base64/base64url encoded' });
            }
        }
        if (pubBytes.length !== 65) {
            return res.status(400).json({ error: 'passkeyPubkey must be 65 bytes (uncompressed secp256r1)' });
        }

        // Derive salt = SHA-256(keyId bytes)
        const saltHex = deriveSaltHex(keyId);
        const saltBuf = Buffer.from(saltHex, 'hex');

        // Ensure WASM is uploaded (install if missing)
        const { wasmHashHex, uploadTx, uploadStatus, uploadError, uploadSendResp, uploadSimError } =
            await ensureWasmInstalled(wasmHash);
        const wasmBuf = Buffer.from(wasmHashHex, 'hex');

        // Constructor args: passkey pubkey (65 bytes) - this initializes the smart account
        const ctorVec = xdr.ScVal.scvVec([
            xdr.ScVal.scvBytes(pubBytes)
        ]);

        const contract = new Contract(factoryId);
        const deployOp = contract.call(
            'deploy',
            xdr.ScVal.scvBytes(wasmBuf),
            xdr.ScVal.scvBytes(saltBuf),
            ctorVec
        );

        const kp = Keypair.fromSecret(DEPLOYER_SECRET);
        const account = await rpcServer.getAccount(kp.publicKey());

        let tx = new TransactionBuilder(account, {
            fee: '10000000', // 1 XLM max fee for mainnet Soroban operations
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(deployOp)
            .setTimeout(30)
            .build();

        // Simulate and prepare footprint
        console.log('📤 Simulating deploy transaction...');
        console.log('   Factory:', factoryId);
        console.log('   WASM Hash:', wasmHashHex);
        console.log('   Salt:', saltHex);
        console.log('   Fee:', tx.fee);

        const sim = await rpcServer.simulateTransaction(tx);
        console.log('✅ Simulation result:', sim.result ? 'SUCCESS' : 'NO_RESULT');
        if (sim.error) {
            console.error('❌ Simulation error:', sim.error);
        }

        const preparedTx = await rpcServer.prepareTransaction(tx, sim);

        preparedTx.sign(kp);

        const sendResp = await rpcServer.sendTransaction(preparedTx);

        // Wait for transaction confirmation (poll until status is SUCCESS or ERROR)
        let finalStatus = sendResp.status;
        let finalTx = null;
        let attempts = 0;
        const maxAttempts = 20; // Wait up to ~20 seconds

        while ((finalStatus === 'PENDING' || finalStatus === 'NOT_FOUND') && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            try {
                finalTx = await rpcServer.getTransaction(sendResp.hash);
                finalStatus = finalTx.status;
                console.log(`Polling transaction ${sendResp.hash}: ${finalStatus} (attempt ${attempts + 1}/${maxAttempts})`);
            } catch (err) {
                console.error('Error polling transaction:', err.message);
            }
            attempts++;
        }

        // Try to parse returned child contract address from simulation result (retval)
        let childId;
        try {
            const retval = sim.result?.retval;
            if (retval?.switch()?.name === 'scvAddress') {
                const addr = retval.address();
                if (addr?.switch()?.name === 'scAddressTypeContract') {
                    childId = StrKey.encodeContract(addr.contractId());
                }
            }
        } catch (_) {
            // ignore parse failure
        }

        // Also try to extract from final transaction metadata if available
        if (!childId && finalTx && finalTx.resultMetaXdr) {
            try {
                const meta = finalTx.resultMetaXdr._value._attributes;
                const operations = meta.operations || [];
                for (const op of operations) {
                    const changes = op._attributes?.changes || [];
                    for (const change of changes) {
                        if (change._arm === 'created' && change._value?._attributes?.data?._arm === 'contractData') {
                            const contract = change._value._attributes.data._value._attributes.contract;
                            if (contract._arm === 'contractId') {
                                childId = StrKey.encodeContract(contract._value);
                                break;
                            }
                        }
                    }
                    if (childId) break;
                }
            } catch (_) {
                // ignore parse failure
            }
        }

        // Store the smart account ID for the user
        if (childId && userId) {
            try {
                await User.findOneAndUpdate(
                    { userId },
                    { smartAccountId: childId }
                );
                console.log(`✅ Stored smart account ${childId} for user ${userId}`);
            } catch (err) {
                console.error('Error storing smart account ID:', err);
            }
        }

        const debug = {
            simError: sim.result?.error,
            simAuth: sim.transactionData?.build().toXDR('base64'),
            sendStatus: sendResp.status,
            finalStatus: finalStatus,
            pollAttempts: attempts,
            sendError: sendResp.errorResultXdr,
            sendDecoded: decodeTxError(sendResp.errorResultXdr),
            uploadTx,
            uploadStatus,
            uploadError,
            uploadDecoded: decodeTxError(uploadError),
            uploadSendResp,
            uploadSimError,
        };

        return res.json({
            saltHex,
            txHash: sendResp.hash,
            childId,
            status: finalStatus,
            debug,
            sendError: sendResp.errorResultXdr,
            uploadError,
        });
    } catch (err) {
        console.error('deploy-child error', err);
        return res.status(500).json({ error: err.message || 'deploy failed' });
    }
});

// DEPRECATED: Initialize child contract with passkey pubkey
// Now handled by constructor during deploy - kept for backwards compatibility
app.post('/init-child', async (req, res) => {
    try {
        if (!DEPLOYER_SECRET) {
            return res.status(400).json({ error: 'SOURCE_SECRET env is required on server to sign init tx' });
        }
        const { childId, passkeyPubkey } = req.body || {};
        if (!childId || !passkeyPubkey) {
            return res.status(400).json({ error: 'childId and passkeyPubkey are required' });
        }
        let pubBytes;
        try {
            pubBytes = Buffer.from(passkeyPubkey, 'base64');
        } catch (_) {
            try {
                pubBytes = Buffer.from(passkeyPubkey, 'base64url');
            } catch (e) {
                return res.status(400).json({ error: 'passkeyPubkey must be base64/base64url' });
            }
        }
        if (pubBytes.length !== 65) {
            return res.status(400).json({ error: 'passkeyPubkey must be 65 bytes (base64/base64url encoded)' });
        }

        const kp = Keypair.fromSecret(DEPLOYER_SECRET);
        const account = await rpcServer.getAccount(kp.publicKey());

        const contract = new Contract(childId);
        const initOp = contract.call(
            'init',
            xdr.ScVal.scvBytes(pubBytes),
        );

        let tx = new TransactionBuilder(account, {
            fee: '10000000', // 1 XLM max fee for mainnet Soroban operations
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(initOp)
            .setTimeout(30)
            .build();

        const sim = await rpcServer.simulateTransaction(tx);
        const preparedTx = await rpcServer.prepareTransaction(tx, sim);
        preparedTx.sign(kp);
        const sendResp = await rpcServer.sendTransaction(preparedTx);

        // Poll for confirmation
        let finalStatus = sendResp.status;
        let attempts = 0;
        const maxAttempts = 20;
        while ((finalStatus === 'PENDING' || finalStatus === 'NOT_FOUND') && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            try {
                const finalTx = await rpcServer.getTransaction(sendResp.hash);
                finalStatus = finalTx.status;
            } catch (_) { }
            attempts++;
        }

        const debug = {
            simError: sim.result?.error,
            simAuth: sim.transactionData?.build().toXDR('base64'),
            sendStatus: sendResp.status,
            sendError: sendResp.errorResultXdr,
            sendDecoded: decodeTxError(sendResp.errorResultXdr),
            finalStatus,
            pollAttempts: attempts,
        };

        return res.json({
            txHash: sendResp.hash,
            status: finalStatus,
            debug,
        });
    } catch (err) {
        console.error('init-child error', err);
        return res.status(500).json({ error: err.message || 'init failed' });
    }
});

// Read nonce from child contract (get_nonce)
app.post('/get-nonce', async (req, res) => {
    try {
        const { childId } = req.body || {};
        if (!childId) return res.status(400).json({ error: 'childId required' });
        const contract = new Contract(childId);
        const op = contract.call('get_nonce');

        const kp = Keypair.fromSecret(DEPLOYER_SECRET || '');
        const account = await rpcServer.getAccount(kp.publicKey());
        let tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(op)
            .setTimeout(30)
            .build();

        const sim = await rpcServer.simulateTransaction(tx);
        const retval = sim.result?.retval;
        if (!retval) return res.status(500).json({ error: 'no retval' });
        let nonceVal = null;
        try {
            if (retval.switch && retval.switch().name === 'scvU64') {
                nonceVal = retval.u64().toString();
            } else if (retval._arm === 'u64') {
                nonceVal = retval._value.toString();
            }
        } catch (_) { }
        if (nonceVal === null) return res.status(500).json({ error: 'could not parse nonce' });
        return res.json({ nonce: nonceVal });
    } catch (err) {
        console.error('get-nonce error', err);
        return res.status(500).json({ error: err.message || 'get-nonce failed' });
    }
});

// Get the passkey public key stored in the contract (for verification)
app.post('/get-contract-pubkey', async (req, res) => {
    try {
        const { childId } = req.body || {};
        if (!childId) return res.status(400).json({ error: 'childId required' });

        const contract = new Contract(childId);
        const op = contract.call('get_passkey');

        const kp = Keypair.fromSecret(DEPLOYER_SECRET || '');
        const account = await rpcServer.getAccount(kp.publicKey());
        let tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(op)
            .setTimeout(30)
            .build();

        const sim = await rpcServer.simulateTransaction(tx);
        const retval = sim.result?.retval;
        if (!retval) return res.status(500).json({ error: 'no retval' });

        let pubkeyBytes = null;
        try {
            if (retval.switch && retval.switch().name === 'scvBytes') {
                pubkeyBytes = Buffer.from(retval.bytes());
            } else if (retval._arm === 'bytes') {
                pubkeyBytes = Buffer.from(retval._value);
            }
        } catch (_) { }

        if (!pubkeyBytes) return res.status(500).json({ error: 'could not parse pubkey' });

        return res.json({
            pubkey: pubkeyBytes.toString('base64'),
            pubkeyBase64url: pubkeyBytes.toString('base64url'),
            length: pubkeyBytes.length
        });
    } catch (err) {
        console.error('get-contract-pubkey error', err);
        return res.status(500).json({ error: err.message || 'get-contract-pubkey failed' });
    }
});

// Get USDC balance of the smart account
app.post('/get-usdc-balance', async (req, res) => {
    try {
        const { childId } = req.body || {};
        if (!childId) return res.status(400).json({ error: 'childId required' });

        const contract = new Contract(childId);
        const op = contract.call('get_usdc_balance');

        const kp = Keypair.fromSecret(DEPLOYER_SECRET || '');
        const account = await rpcServer.getAccount(kp.publicKey());
        let tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(op)
            .setTimeout(30)
            .build();

        const sim = await rpcServer.simulateTransaction(tx);
        const retval = sim.result?.retval;
        if (!retval) return res.status(500).json({ error: 'no retval' });

        let balanceVal = null;
        try {
            if (retval.switch && retval.switch().name === 'scvI128') {
                const i128 = retval.i128();
                const hi = i128.hi();
                const lo = i128.lo();
                balanceVal = (BigInt(hi) << 64n) | BigInt(lo);
            } else if (retval._arm === 'i128') {
                const i128 = retval._value;
                const hi = i128.hi;
                const lo = i128.lo;
                balanceVal = (BigInt(hi) << 64n) | BigInt(lo);
            }
        } catch (_) { }

        if (balanceVal === null) return res.status(500).json({ error: 'could not parse balance' });

        // Convert stroops to USDC (1 USDC = 10000000 stroops)
        const balanceInUsdc = Number(balanceVal) / 10000000;

        return res.json({
            balance: balanceVal.toString(),
            balanceInStroops: balanceVal.toString(),
            balanceInUsdc: balanceInUsdc.toFixed(7)
        });
    } catch (err) {
        console.error('get-usdc-balance error', err);
        return res.status(500).json({ error: err.message || 'get-usdc-balance failed' });
    }
});

// Transfer USDC using passkey signature with WebAuthn data
app.post('/transfer-usdc', async (req, res) => {
    try {
        if (!DEPLOYER_SECRET) {
            return res.status(400).json({ error: 'SOURCE_SECRET env is required' });
        }
        const { childId, recipient, amount, signatureHex, authData, clientDataJSON } = req.body || {};
        if (!childId || !recipient || amount === undefined || !signatureHex || !authData || !clientDataJSON) {
            return res.status(400).json({ error: 'childId, recipient, amount, signatureHex, authData, clientDataJSON required' });
        }
        const sigBuf = Buffer.from(signatureHex, 'hex');
        if (sigBuf.length !== 64) return res.status(400).json({ error: 'signatureHex must be 64-byte hex (r||s)' });

        // Decode authData and clientDataJSON from base64url
        const authDataBuf = Buffer.from(authData, 'base64url');
        const clientDataBuf = Buffer.from(clientDataJSON, 'base64url');

        console.log('Transfer USDC request:');
        console.log('  - Signature length:', sigBuf.length);
        console.log('  - AuthData length:', authDataBuf.length);
        console.log('  - ClientDataJSON length:', clientDataBuf.length);
        console.log('  - ClientDataJSON:', clientDataBuf.toString('utf8'));

        const contract = new Contract(childId);
        const amt = BigInt(amount);
        const hi = amt >> 64n;
        const lo = amt & ((1n << 64n) - 1n);
        const hiXdr = xdr.Int64.fromString(hi.toString());
        const loXdr = xdr.Uint64.fromString(lo.toString());
        const int128 = new xdr.Int128Parts({ hi: hiXdr, lo: loXdr });

        const transferOp = contract.call(
            'transfer_usdc',
            xdr.ScVal.scvAddress(Address.fromString(recipient).toScAddress()),
            xdr.ScVal.scvI128(int128),
            xdr.ScVal.scvBytes(sigBuf),
            xdr.ScVal.scvBytes(authDataBuf),
            xdr.ScVal.scvBytes(clientDataBuf),
        );


        console.log("Transfer USDC operation:", transferOp);
        const kp = Keypair.fromSecret(DEPLOYER_SECRET);
        const account = await rpcServer.getAccount(kp.publicKey());
        let tx = new TransactionBuilder(account, {
            fee: '10000000', // 1 XLM max fee for mainnet Soroban operations
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(transferOp)
            .setTimeout(30)
            .build();

        const sim = await rpcServer.simulateTransaction(tx);
        const preparedTx = await rpcServer.prepareTransaction(tx, sim);
        preparedTx.sign(kp);
        const sendResp = await rpcServer.sendTransaction(preparedTx);

        // Poll for confirmation
        let finalStatus = sendResp.status;
        let attempts = 0;
        const maxAttempts = 20;
        while ((finalStatus === 'PENDING' || finalStatus === 'NOT_FOUND') && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            try {
                const finalTx = await rpcServer.getTransaction(sendResp.hash);
                finalStatus = finalTx.status;
            } catch (_) { }
            attempts++;
        }

        const debug = {
            simError: sim.result?.error,
            simAuth: sim.transactionData?.build().toXDR('base64'),
            sendStatus: sendResp.status,
            sendError: sendResp.errorResultXdr,
            sendDecoded: decodeTxError(sendResp.errorResultXdr),
            finalStatus,
            pollAttempts: attempts,
        };

        // Record successful transaction in MongoDB
        if (finalStatus === 'SUCCESS') {
            try {
                await Transaction.create({
                    hash: sendResp.hash,
                    userId: childId, // Using smart contract ID as userId
                    ledger: null, // Will be updated if we query later
                    createdAt: new Date(),
                    tokenSymbol: 'USDC',
                    amount: amount.toString(),
                    memo: null,
                    from: childId,
                    to: recipient,
                    direction: 'out',
                    rawAsset: null,
                    pagingToken: sendResp.hash
                });
                console.log(`✅ Recorded USDC transfer: ${sendResp.hash}`);
            } catch (dbErr) {
                // Don't fail the request if DB recording fails
                console.error('Failed to record transaction:', dbErr.message);
            }
        }

        return res.json({
            txHash: sendResp.hash,
            status: finalStatus,
            debug,
        });
    } catch (err) {
        console.error('transfer-usdc error', err);
        return res.status(500).json({ error: err.message || 'transfer failed' });
    }
});

function deriveSaltHex(base64urlId) {
    const buf = Buffer.from(base64urlId, 'base64url');
    return crypto.createHash('sha256').update(buf).digest('hex');
}

async function ensureWasmInstalled(expectedHashHex) {
    const wasmBytes = fs.readFileSync(CHILD_WASM_PATH);
    const actualHash = crypto.createHash('sha256').update(wasmBytes).digest('hex');
    if (expectedHashHex && expectedHashHex.toLowerCase() !== actualHash) {
        throw new Error(`Provided wasmHash does not match wasm file. Provided=${expectedHashHex}, actual=${actualHash}`);
    }

    // For mainnet with pre-uploaded WASM hash, skip upload
    if (expectedHashHex && expectedHashHex.toLowerCase() === CHILD_WASM_HASH.toLowerCase()) {
        console.log(`Using pre-uploaded WASM hash: ${CHILD_WASM_HASH}`);
        return {
            wasmHashHex: CHILD_WASM_HASH,
            uploadTx: null,
            uploadStatus: 'SKIPPED',
            uploadError: null,
            uploadSendResp: null,
            uploadSimError: null,
        };
    }

    const kp = Keypair.fromSecret(DEPLOYER_SECRET);
    const account = await rpcServer.getAccount(kp.publicKey());

    // Attempt auto-fund on testnet
    if (NETWORK_PASSPHRASE.includes('Test SDF Network')) {
        await maybeFriendbotFund(kp.publicKey());
    }

    // Upload WASM (uses native helper if available, else host function)
    let uploadOp;
    if (typeof rpcServer.installContractCode === 'function') {
        // High-level install call
        const resp = await rpcServer.installContractCode(wasmBytes, kp, NETWORK_PASSPHRASE);
        if (resp?.status && resp.status !== 'SUCCESS') {
            throw new Error(`WASM upload failed (installContractCode): ${resp.status}`);
        }
        return {
            wasmHashHex: actualHash,
            uploadTx: resp?.hash,
            uploadStatus: resp?.status || 'UNKNOWN',
            uploadError: resp?.errorResultXdr || null,
            uploadSendResp: resp,
            uploadSimError: null,
        };
    } else if (typeof Operation.uploadContractWasm === 'function') {
        uploadOp = Operation.uploadContractWasm({ wasm: wasmBytes });
    } else if (xdr.HostFunction?.hostFunctionUploadContractWasm) {
        const hostFn = xdr.HostFunction.hostFunctionUploadContractWasm(wasmBytes);
        uploadOp = Operation.invokeHostFunction({
            func: hostFn,
            auth: [],
        });
    } else if (xdr.HostFunction?.hostFunctionTypeUploadContractWasm) {
        const hostFn = xdr.HostFunction.hostFunctionTypeUploadContractWasm(wasmBytes);
        uploadOp = Operation.invokeHostFunction({
            func: hostFn,
            auth: [],
        });
    } else {
        throw new Error('No supported host function for uploadContractWasm in this SDK version');
    }

    let tx = new TransactionBuilder(account, {
        fee: '10000000', // 1 XLM max fee for mainnet Soroban operations
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(uploadOp)
        .setTimeout(30)
        .build();

    const sim = await rpcServer.simulateTransaction(tx);
    const prepared = await rpcServer.prepareTransaction(tx, sim);
    prepared.sign(kp);
    const sendResp = await rpcServer.sendTransaction(prepared);

    // Poll for confirmation
    let finalStatus = sendResp.status;
    let attempts = 0;
    const maxAttempts = 20;
    while ((finalStatus === 'PENDING' || finalStatus === 'NOT_FOUND') && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
            const finalTx = await rpcServer.getTransaction(sendResp.hash);
            finalStatus = finalTx.status;
        } catch (_) { }
        attempts++;
    }
    if (finalStatus !== 'SUCCESS') {
        throw new Error(`WASM upload failed: ${finalStatus}`);
    }

    // Parse returned wasm hash from sim result
    let installedHashHex = actualHash;
    try {
        const retval = sim.result?.retval;
        if (retval?.switch()?.name === 'scvBytes') {
            installedHashHex = Buffer.from(retval.bytes()).toString('hex');
        }
    } catch (_) {
        // ignore parse failure
    }

    return {
        wasmHashHex: installedHashHex,
        uploadTx: sendResp.hash,
        uploadStatus: sendResp.status,
        uploadError: sendResp.errorResultXdr,
        uploadSendResp: sendResp,
        uploadSimError: sim.result?.error,
    };
}

async function maybeFriendbotFund(pubKey) {
    return new Promise((resolve) => {
        try {
            const url = `https://friendbot.stellar.org/?addr=${encodeURIComponent(pubKey)}`;
            https.get(url, (res) => {
                res.on('data', () => { });
                res.on('end', () => resolve());
            }).on('error', () => resolve());
        } catch (_) {
            resolve();
        }
    });
}

function decodeTxError(errXdr) {
    if (!errXdr) return null;
    try {
        const buff = Buffer.from(errXdr, 'base64');
        const res = xdr.TransactionResult.fromXDR(buff);
        return res.result().value().toString();
    } catch (e) {
        return errXdr;
    }
}


// ============================================================
// GET /transactions - Query locally saved transactions
// ============================================================
// Query params:
//   - userId: Filter by userId (smart contract ID)
//   - address: Filter by address (checks both from and to fields)
//   - limit: Number of results per page (default: 20, max: 100)
//   - page: Page number (default: 1)
// ============================================================
app.get('/transactions', async (req, res) => {
    try {
        const { userId, address, limit: limitStr = '20', page: pageStr = '1' } = req.query;

        const limit = Math.min(Math.max(parseInt(limitStr, 10) || 20, 1), 100);
        const page = Math.max(parseInt(pageStr, 10) || 1, 1);
        const skip = (page - 1) * limit;

        // Build filter query
        let filter = {};

        if (address) {
            // Filter by address - check both 'from' and 'to' fields
            filter.$or = [
                { from: address },
                { to: address }
            ];
        }
        else if (userId) {
            // Filter by userId (smart contract ID)
            filter.userId = userId;
        }

        // Query transactions with pagination and sorting
        const transactions = await Transaction.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Transaction.countDocuments(filter);

        return res.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error('Error in GET /transactions:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// ============================================================
// Support Ticket System
// ============================================================

// POST /tickets - Create a new support ticket
app.post('/tickets', async (req, res) => {
    try {
        const { title, description, walletAddress, type } = req.body;

        // Validation
        if (!title || !description || !walletAddress || !type) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['title', 'description', 'walletAddress', 'type']
            });
        }

        // Validate type enum
        if (!['feedback', 'query'].includes(type)) {
            return res.status(400).json({
                error: 'Invalid type. Must be "feedback" or "query"'
            });
        }

        // Create ticket (status defaults to 'open')
        const ticket = await SupportTicket.create({
            title,
            description,
            walletAddress,
            type
        });

        console.log(`✅ Created support ticket: ${ticket._id}`);

        return res.status(201).json({
            success: true,
            ticket
        });

    } catch (err) {
        console.error('Error in POST /tickets:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// GET /tickets/:walletAddress - Get tickets for a wallet (only type: 'query')
app.get('/tickets/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { limit: limitStr = '20', page: pageStr = '1' } = req.query;

        const limit = Math.min(Math.max(parseInt(limitStr, 10) || 20, 1), 100);
        const page = Math.max(parseInt(pageStr, 10) || 1, 1);
        const skip = (page - 1) * limit;

        // Build filter - only return 'query' type tickets
        const filter = {
            walletAddress,
            type: 'query'
        };

        // Query tickets with pagination and sorting (most recent first)
        const tickets = await SupportTicket.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await SupportTicket.countDocuments(filter);

        return res.json({
            tickets,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error('Error in GET /tickets/:walletAddress:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`\n🚀 Server started on PORT:${PORT}`);
    console.log(`📱 Mobile Access:`);
    console.log(`   - Backend API: http://${LOCAL_IP}:${PORT}`);
    console.log(`   - Frontend: http://${LOCAL_IP}:5173`);
    console.log(`\n💻 Local Access:`);
    console.log(`   - Backend API: ${ORIGIN}`);
    console.log(`   - Frontend: ${VITE_ORIGIN}`);
    console.log(`\n⚙️  Configuration:`);
    console.log(`   - RP ID: ${RP_ID}`);
    console.log(`   - RP Name: ${RP_NAME}`);
    console.log(`\n⚠️  For mobile WebAuthn, you need:`);
    console.log(`   1. HTTPS (use ngrok or similar for localhost)`);
    console.log(`   2. Mobile device on same network`);
    console.log(`   3. Or use: http://${LOCAL_IP}:5173 on mobile browser\n`);
}) 