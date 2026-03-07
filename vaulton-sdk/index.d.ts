export type VaultonSession = {
  userId: string;
  smartAccountId: string;
  passkeyPubkey: string;
  publicKeyHex: string;
  name: string;
  createdAt: string;
  credentialId: string;
};

export type VaultonSdkConfig = {
  baseURL?: string;
  backendUrl?: string;
  storageKey?: string;
};

export type TransferUsdcInput = {
  recipient: string;
  amountUsdc: string | number;
};

export declare class VaultonWalletSDK {
  constructor(config?: VaultonSdkConfig);
  getSession(): VaultonSession | null;
  restoreSession(): VaultonSession | null;
  isLoggedIn(): boolean;
  logoutAccount(): void;
  signupAccount(): Promise<VaultonSession>;
  createAccount(): Promise<VaultonSession>;
  loginAccount(): Promise<VaultonSession>;
  getAccountInfo(userId?: string): Promise<any>;
  getUsdcBalance(childId?: string): Promise<any>;
  transferUsdc(input: TransferUsdcInput): Promise<any>;
  sendUsdc(input: TransferUsdcInput): Promise<any>;
}

export declare const createVaultonWalletSDK: (config?: VaultonSdkConfig) => VaultonWalletSDK;

export declare const VAULTON_SDK_DEFAULTS: {
  backendUrl: string;
  storageKey: string;
};
