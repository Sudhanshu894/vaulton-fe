const STELLAR_ADDRESS_RE = /\b[GC][A-Z2-7]{20,}\b/;
const EVM_ADDRESS_RE = /\b0x[a-fA-F0-9]{40}\b/;

const sanitizeAmount = (value) => {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (!/^\d+(?:\.\d+)?$/.test(text)) return "";
  return text;
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const truthyParam = (value) => {
  const text = String(value || "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
};

const extractAddress = (text) => {
  const stellarMatch = text.match(STELLAR_ADDRESS_RE);
  if (stellarMatch) return stellarMatch[0];

  const evmMatch = text.match(EVM_ADDRESS_RE);
  if (evmMatch) return evmMatch[0];

  return "";
};

export const buildVaultonSendLink = ({ origin, recipient, amount }) => {
  if (!origin || !recipient) return "";
  const url = new URL("/dashboard", origin);
  url.searchParams.set("tab", "send");
  url.searchParams.set("recipient", recipient);
  const normalizedAmount = sanitizeAmount(amount);
  if (normalizedAmount) {
    url.searchParams.set("amount", normalizedAmount);
  }
  url.searchParams.set("source", "vaulton_request");
  return url.toString();
};

export const buildVaultonTipLink = ({
  origin,
  slug,
  recipient,
  amount,
  minAmount,
  creatorName,
}) => {
  if (!origin || !recipient) return "";
  const normalizedSlug = String(slug || recipient || "creator")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "creator";

  const url = new URL(`/tip/${normalizedSlug}`, origin);
  url.searchParams.set("recipient", recipient);
  url.searchParams.set("tip", "1");

  const normalizedAmount = sanitizeAmount(amount);
  if (normalizedAmount) {
    url.searchParams.set("amount", normalizedAmount);
  }
  const normalizedMinAmount = sanitizeAmount(minAmount);
  if (normalizedMinAmount) {
    url.searchParams.set("minAmount", normalizedMinAmount);
  }
  if (creatorName) {
    url.searchParams.set("creatorName", String(creatorName));
  }
  return url.toString();
};

export const buildStellarPayUri = ({ recipient, amount }) => {
  if (!recipient) return "";
  const params = new URLSearchParams();
  params.set("destination", recipient);
  const normalizedAmount = sanitizeAmount(amount);
  if (normalizedAmount) {
    params.set("amount", normalizedAmount);
  }
  return `stellar:pay?${params.toString()}`;
};

const parseUrlLike = (raw) => {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const protocol = (url.protocol || "").toLowerCase();
  const pathname = (url.pathname || "").toLowerCase();
  const params = url.searchParams;

  const recipient = firstNonEmpty(
    params.get("recipient"),
    params.get("destination"),
    params.get("address"),
    protocol === "ethereum:" ? extractAddress(raw) : "",
    protocol === "stellar:" || protocol === "web+stellar:" ? params.get("destination") : "",
    pathname.includes("/send") ? params.get("to") : ""
  ) || extractAddress(raw);

  const amount = sanitizeAmount(
    firstNonEmpty(
      params.get("amount"),
      params.get("value"),
      params.get("uint256"),
      params.get("requestAmount")
    )
  );

  return {
    recipient,
    amount,
    source: protocol || "url",
    raw,
  };
};

const parseJsonLike = (raw) => {
  if (!raw || !raw.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const recipient = firstNonEmpty(parsed.recipient, parsed.destination, parsed.address) || "";
    const amount = sanitizeAmount(parsed.amount);
    if (!recipient && !amount) return null;
    return { recipient, amount, source: "json", raw };
  } catch {
    return null;
  }
};

export const parsePaymentRequest = (rawValue) => {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return { recipient: "", amount: "", source: "empty", raw: "" };
  }

  const jsonParsed = parseJsonLike(raw);
  if (jsonParsed) return jsonParsed;

  const urlParsed = parseUrlLike(raw);
  if (urlParsed && (urlParsed.recipient || urlParsed.amount)) {
    return urlParsed;
  }

  if (raw.startsWith("stellar:") || raw.startsWith("web+stellar:")) {
    try {
      const fakeUrl = new URL(raw.replace(/^web\+stellar:/, "stellar:"));
      const recipient = firstNonEmpty(fakeUrl.searchParams.get("destination")) || extractAddress(raw);
      const amount = sanitizeAmount(fakeUrl.searchParams.get("amount"));
      return { recipient, amount, source: "stellar-uri", raw };
    } catch {
      // fall through
    }
  }

  const recipient = extractAddress(raw);
  const amountMatch = raw.match(/(?:amount|value)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i);
  const amount = sanitizeAmount(amountMatch?.[1] || "");

  return {
    recipient,
    amount,
    source: recipient ? "address" : "unknown",
    raw,
  };
};

export const getDashboardSendPrefill = (searchParams) => {
  if (!searchParams) return null;

  const tab = searchParams.get("tab");
  const directRecipient = firstNonEmpty(
    searchParams.get("recipient"),
    searchParams.get("destination"),
    searchParams.get("address")
  );
  const directAmount = sanitizeAmount(searchParams.get("amount"));
  const tipMode = truthyParam(
    firstNonEmpty(
      searchParams.get("tip"),
      searchParams.get("superchat"),
      searchParams.get("donation")
    )
  );
  const creatorName = firstNonEmpty(
    searchParams.get("creatorName"),
    searchParams.get("creator"),
    searchParams.get("name")
  );
  const creatorUserId = firstNonEmpty(
    searchParams.get("creatorUserId"),
    searchParams.get("creatorId")
  );
  const defaultMessage = firstNonEmpty(
    searchParams.get("message"),
    searchParams.get("tipMessage")
  );
  const tipMinAmount = sanitizeAmount(
    firstNonEmpty(
      searchParams.get("minAmount"),
      searchParams.get("minimumAmount"),
      searchParams.get("tipMin"),
      searchParams.get("tipMinimum")
    )
  );

  if (tab === "send" || directRecipient || directAmount || tipMode) {
    return {
      tab: "send",
      recipient: directRecipient,
      amount: directAmount,
      source: firstNonEmpty(searchParams.get("source"), "dashboard-link"),
      tipMode,
      creatorName,
      creatorUserId,
      defaultMessage,
      tipMinAmount,
    };
  }

  if (tab === "home") {
    return { tab: "home", recipient: "", amount: "", source: "dashboard-link" };
  }

  return null;
};

export const shortAddress = (address, start = 8, end = 8) => {
  const value = String(address || "");
  if (!value) return "-";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};
