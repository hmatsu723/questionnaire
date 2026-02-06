type Env = {
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME?: string;
  BREVO_TO_EMAIL: string;
  BREVO_TO_NAME?: string;
  DUMMY_SEND?: string;
};

const genderLabels: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
  no_answer: "無回答",
};

const occupationLabels: Record<string, string> = {
  employee: "会社員",
  executive: "会社役員",
  public_servant: "公務員",
  self_employed: "自営業",
  homemaker: "主夫・主婦",
  part_time: "アルバイト",
  student: "学生",
  other: "その他",
};

const livingIssueLabels: Record<string, string> = {
  mortgage: "住宅ローン",
  unsecured_loan: "無担保ローン",
  inheritance: "相続",
  rent: "離婚",
  other: "その他",
};

const propertyTypeLabels: Record<string, string> = {
  land: "土地",
  house: "戸建",
  apartment: "マンション",
};

const debtStatusLabels: Record<string, string> = {
  no_delinquency: "滞納無し",
  delinquent: "滞納中",
  repayment_not_started: "競売開始決定済み",
};

function asDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "未入力";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join("、") : "未入力";
  }
  return String(value);
}

function mapValues(values: unknown, labelMap: Record<string, string>): string {
  if (values === null || values === undefined) return "未入力";
  if (Array.isArray(values)) {
    const mapped = values.map((item) => labelMap[item] ?? item);
    return mapped.length > 0 ? mapped.join("、") : "未入力";
  }
  const value = String(values);
  return labelMap[value] ?? value;
}

function formatFullName(last: unknown, first: unknown): string {
  const lastValue = last ? String(last).trim() : "";
  const firstValue = first ? String(first).trim() : "";
  const parts = [lastValue, firstValue].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "未入力";
}

function createEmailMessage(payload: Record<string, unknown>) {
  const subject = "アンケートが送信されました";
  const lines = [
    "以下の内容でアンケートを受け付けました。",
    "",
    `名前：${formatFullName(payload.lastName, payload.firstName)}`,
    `名前（フリガナ）：${formatFullName(payload.lastNameKana, payload.firstNameKana)}`,
    `郵便番号：${asDisplayValue(payload.postalCode)}`,
    `都道府県：${asDisplayValue(payload.prefecture)}`,
    `市区町村：${asDisplayValue(payload.city)}`,
    `番地：${asDisplayValue(payload.street)}`,
    `建物名・部屋番号：${asDisplayValue(payload.building)}`,
    `電話：${asDisplayValue(payload.phone)}`,
    `メールアドレス：${asDisplayValue(payload.email)}`,
    `性別：${mapValues(payload.gender, genderLabels)}`,
    `ご職業：${mapValues(payload.occupation, occupationLabels)}`,
    `業種：${asDisplayValue(payload.industry)}`,
    `現在のお困り事（複数選択）：${mapValues(payload.livingIssues, livingIssueLabels)}`,
    `物件種別（複数選択）：${mapValues(payload.propertyTypes, propertyTypeLabels)}`,
    `敷地（m2）：${asDisplayValue(payload.siteArea)}`,
    `築年数：${asDisplayValue(payload.buildingAge)}`,
    `ローン残債（万円）：${asDisplayValue(payload.loanBalance)}`,
    `債務状況：${mapValues(payload.debtStatus, debtStatusLabels)}`,
    `滞納期間：${asDisplayValue(payload.delinquencyPeriod)}`,
    "その他、ご質問・ご相談事項：",
    `${asDisplayValue(payload.notes)}`,
  ];

  return {
    subject,
    body: lines.join("\n"),
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function isLikelyBot(payload: Record<string, unknown>): boolean {
  const honeypot = typeof payload.website === "string" ? payload.website.trim() : "";
  if (honeypot.length > 0) return true;

  const startedAtRaw = payload.formStartedAt;
  const startedAt = typeof startedAtRaw === "string" ? Number(startedAtRaw) : Number(startedAtRaw);
  if (!Number.isFinite(startedAt)) return true;

  const elapsedMs = Date.now() - startedAt;
  return elapsedMs > 0 && elapsedMs < 2000;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/submit") {
      return jsonResponse(404, { ok: false, error: "Not Found" });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          Allow: "POST",
          ...corsHeaders,
        },
      });
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { ok: false, error: "JSON形式が正しくありません。" });
    }

    if (isLikelyBot(payload)) {
      return jsonResponse(400, { ok: false, error: "不正な送信が検出されました。" });
    }

    if (env.DUMMY_SEND === "true" || env.DUMMY_SEND === "1") {
      const emailMessage = createEmailMessage(payload);
      return jsonResponse(200, {
        ok: true,
        dummy: true,
        subject: emailMessage.subject,
        body: emailMessage.body,
      });
    }

    if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL || !env.BREVO_TO_EMAIL) {
      return jsonResponse(500, {
        ok: false,
        error: "BREVO_API_KEY/BREVO_SENDER_EMAIL/BREVO_TO_EMAIL を設定してください。",
      });
    }

    const emailMessage = createEmailMessage(payload);
    const senderName = env.BREVO_SENDER_NAME || "アンケート";
    const toName = env.BREVO_TO_NAME?.trim();
    const toEntry = {
      email: env.BREVO_TO_EMAIL,
      ...(toName ? { name: toName } : {}),
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          email: env.BREVO_SENDER_EMAIL,
          name: senderName,
        },
        to: [toEntry],
        subject: emailMessage.subject,
        textContent: emailMessage.body,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return jsonResponse(502, { ok: false, error: "Brevo送信に失敗しました。", detail });
    }

    return jsonResponse(200, { ok: true });
  },
};
