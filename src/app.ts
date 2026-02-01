const form = document.getElementById("questionnaireForm") as HTMLFormElement | null;
const alertPlaceholder = document.getElementById("alertPlaceholder") as HTMLDivElement | null;
const livingIssuesGroup = document.getElementById("livingIssuesGroup") as HTMLDivElement | null;
const livingIssuesFeedback = document.getElementById("livingIssuesFeedback") as HTMLDivElement | null;
const propertyTypesGroup = document.getElementById("propertyTypesGroup") as HTMLDivElement | null;
const propertyTypesFeedback = document.getElementById("propertyTypesFeedback") as HTMLDivElement | null;
const delinquencyPeriodWrapper = document.getElementById("delinquencyPeriodWrapper") as HTMLDivElement | null;
const delinquencyPeriodSelect = document.getElementById("delinquencyPeriod") as HTMLSelectElement | null;
const postalCodeInput = document.getElementById("postalCode") as HTMLInputElement | null;
const prefectureSelect = document.getElementById("prefecture") as HTMLSelectElement | null;
const cityInput = document.getElementById("city") as HTMLInputElement | null;
const debugSection = document.getElementById("debugSection") as HTMLDivElement | null;
const debugPayload = document.getElementById("debugPayload") as HTMLPreElement | null;
const privacyConsent = document.getElementById("privacyConsent") as HTMLInputElement | null;
const privacyConsentFeedback = document.getElementById("privacyConsentFeedback") as HTMLDivElement | null;
const submitButton = document.getElementById("submitButton") as HTMLButtonElement | null;

type FormPayload = Record<string, unknown> & {
  livingIssues?: string[];
  propertyTypes?: string[];
};

type EmailMessage = {
  subject: string;
  body: string;
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

/**
 * アンケート内容からメール件名と本文を生成する。
 */
function createEmailMessage(payload: FormPayload): EmailMessage {
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
    `敷地（㎡）：${asDisplayValue(payload.siteArea)}`,
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

/**
 * 画面上部にアラートを表示する。
 */
function showAlert(message: string, type: "success" | "danger"): void {
  if (!alertPlaceholder) return;
  alertPlaceholder.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      ${message}
    </div>
  `;
}

/**
 * プライバシーポリシー同意の状態をボタンに反映する。
 */
function syncPrivacyConsentState(): void {
  if (!privacyConsent || !submitButton) return;
  const consentOk = privacyConsent.checked;
  submitButton.disabled = !consentOk;
  privacyConsent.setCustomValidity(consentOk ? "" : "プライバシーポリシーに同意してください。");
  if (consentOk) {
    privacyConsent.classList.remove("is-invalid");
    privacyConsentFeedback?.classList.add("d-none");
  }
}

/**
 * 同意不足のエラー表示を行う。
 */
function showPrivacyConsentError(): void {
  if (!privacyConsent) return;
  privacyConsent.classList.add("is-invalid");
  privacyConsentFeedback?.classList.remove("d-none");
}

/**
 * チェックボックスグループの妥当性表示を切り替える。
 */
function setGroupValidity(groupEl: HTMLElement | null, feedbackEl: HTMLElement | null, isValid: boolean): void {
  if (!groupEl || !feedbackEl) return;
  groupEl.classList.toggle("border", !isValid);
  groupEl.classList.toggle("border-danger", !isValid);
  groupEl.classList.toggle("p-2", !isValid);
  groupEl.classList.toggle("rounded-2", true);
  feedbackEl.classList.toggle("d-none", isValid);
}

/**
 * グループ内で1つ以上チェックされているかを検証する。
 */
function validateAtLeastOneChecked(
  groupEl: HTMLElement | null,
  feedbackEl: HTMLElement | null,
  message = "1つ以上選択してください。",
): boolean {
  if (!groupEl) return true;
  const checkboxes = groupEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  const anyChecked = Array.from(checkboxes).some((c) => c.checked);
  const firstCheckbox = checkboxes[0];
  if (firstCheckbox) {
    firstCheckbox.setCustomValidity(anyChecked ? "" : message);
  }
  checkboxes.forEach((checkbox) => {
    checkbox.classList.toggle("is-invalid", !anyChecked);
    checkbox.classList.remove("is-valid");
  });
  setGroupValidity(groupEl, feedbackEl, anyChecked);
  return anyChecked;
}

/**
 * 債務状況の選択値を取得する。
 */
function getDebtStatus(): string {
  const checked = document.querySelector<HTMLInputElement>('input[name="debtStatus"]:checked');
  return checked ? checked.value : "";
}

/**
 * 債務状況に応じて滞納期間の必須属性と入力可否を切り替える。
 */
function syncDelinquencyPeriodVisibility(): void {
  if (!delinquencyPeriodWrapper || !delinquencyPeriodSelect) return;
  const isDelinquent = getDebtStatus() === "delinquent";
  delinquencyPeriodSelect.toggleAttribute("required", isDelinquent);
  delinquencyPeriodSelect.toggleAttribute("disabled", !isDelinquent);
  if (!isDelinquent) {
    delinquencyPeriodSelect.value = "";
    delinquencyPeriodSelect.classList.remove("is-invalid");
  }
}

/**
 * 標準フォーム要素に is-invalid を付与してエラーメッセージを表示する。
 */
function applyValidationStyles(formEl: HTMLFormElement): void {
  const controls = formEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "input, select, textarea",
  );
  controls.forEach((control) => {
    if (control.type === "checkbox" || control.type === "radio") return;
    if (!control.checkValidity()) {
      control.classList.add("is-invalid");
    } else {
      control.classList.remove("is-invalid");
    }
  });
}

/**
 * 郵便番号から住所を取得し、都道府県と市区町村を自動入力する。
 */
async function fetchAddressByPostalCode(zipcode: string): Promise<void> {
  if (!prefectureSelect || !cityInput) return;

  try {
    const response = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`,
    );
    if (!response.ok) return;

    const data = (await response.json()) as {
      status: number;
      results?: Array<{
        address1: string;
        address2: string;
        address3: string;
      }>;
    };

    if (data.status !== 200 || !data.results || data.results.length === 0) {
      return;
    }

    const { address1, address2, address3 } = data.results[0];
    prefectureSelect.value = address1;
    cityInput.value = `${address2}${address3}`;
  } catch {
    // 取得失敗時は手入力を優先し、エラー表示は行わない
  }
}

document.querySelectorAll<HTMLInputElement>('input[name="debtStatus"]').forEach((radio) => {
  radio.addEventListener("change", syncDelinquencyPeriodVisibility);
});
syncDelinquencyPeriodVisibility();
syncPrivacyConsentState();

if (form) {
  if (privacyConsent) {
    privacyConsent.addEventListener("change", () => {
      syncPrivacyConsentState();
      if (privacyConsent.checked) {
        privacyConsentFeedback?.classList.add("d-none");
      }
    });
  }

  if (postalCodeInput) {
    let postalLookupTimer: number | undefined;
    let lastPostalLookup = "";

    const schedulePostalLookup = () => {
      if (!postalCodeInput) return;
      const normalized = postalCodeInput.value.replace(/\D/g, "");

      // 郵便番号が7桁になった時だけAPIを叩く
      if (normalized.length !== 7 || normalized === lastPostalLookup) return;

      if (postalLookupTimer) {
        window.clearTimeout(postalLookupTimer);
      }
      postalLookupTimer = window.setTimeout(() => {
        lastPostalLookup = normalized;
        fetchAddressByPostalCode(normalized);
      }, 300);
    };

    postalCodeInput.addEventListener("blur", schedulePostalLookup);
    postalCodeInput.addEventListener("input", schedulePostalLookup);
  }

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    // 複数選択の必須チェックは変更タイミングで補助的に検証する
    if (target.type === "checkbox" && target.name === "livingIssues") {
      validateAtLeastOneChecked(livingIssuesGroup, livingIssuesFeedback);
    }
    if (target.type === "checkbox" && target.name === "propertyTypes") {
      validateAtLeastOneChecked(propertyTypesGroup, propertyTypesFeedback);
    }
  });

  form.addEventListener("submit", async (event) => {
    if (privacyConsent && !privacyConsent.checked) {
      event.preventDefault();
      event.stopPropagation();
      showPrivacyConsentError();
      showAlert("プライバシーポリシーに同意してください。", "danger");
      return;
    }

    // カスタム検証（複数選択・条件付き必須）を事前に判定する
    const livingIssuesOk = validateAtLeastOneChecked(livingIssuesGroup, livingIssuesFeedback);
    const propertyTypesOk = validateAtLeastOneChecked(propertyTypesGroup, propertyTypesFeedback);

    syncDelinquencyPeriodVisibility();
    // 滞納中のみ滞納期間を必須扱いにする
    const delinquencyOk =
      getDebtStatus() !== "delinquent" ||
      (delinquencyPeriodSelect && delinquencyPeriodSelect.value.trim().length > 0);

    if (delinquencyPeriodSelect) {
      delinquencyPeriodSelect.setCustomValidity(delinquencyOk ? "" : "滞納期間を選択してください。");
      delinquencyPeriodSelect.classList.toggle("is-invalid", !delinquencyOk);
    }

    if (!form.checkValidity() || !livingIssuesOk || !propertyTypesOk || !delinquencyOk) {
      event.preventDefault();
      event.stopPropagation();
      form.classList.add("was-validated");
      applyValidationStyles(form);
      form.reportValidity();
      showAlert("未入力の必須項目があります。入力内容をご確認ください。", "danger");
      return;
    }

    event.preventDefault();
    form.classList.add("was-validated");

    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries()) as FormPayload;
    // FormDataは複数選択を配列化しないため、手動で配列に変換する
    payload.livingIssues = data.getAll("livingIssues") as string[];
    payload.propertyTypes = data.getAll("propertyTypes") as string[];
    const payloadJson = JSON.stringify(payload);
    const emailMessage = createEmailMessage(payload);

    if (debugSection) {
      debugSection.classList.add("d-none");
    }
    if (debugPayload) {
      debugPayload.textContent = "";
    }

    const endpoint = form.action;
    if (!endpoint) {
      showAlert("送信先が設定されていません。", "danger");
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payloadJson,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errorBody = (await response.json()) as { error?: string; detail?: string };
          detail = errorBody.detail ?? errorBody.error ?? "";
        } catch {
          detail = await response.text();
        }

        const message = detail ? `送信に失敗しました。${detail}` : "送信に失敗しました。";
        showAlert(message, "danger");
        return;
      }

      const result = (await response.json()) as {
        ok: boolean;
        dummy?: boolean;
        subject?: string;
        body?: string;
      };

      if (result.dummy) {
        if (debugSection) {
          debugSection.classList.remove("d-none");
        }
        if (debugPayload) {
          debugPayload.textContent = JSON.stringify(
            {
              ...payload,
              _mailSubject: result.subject,
              _mailBody: result.body,
            },
            null,
            2,
          );
        }
        console.log("submit payload", payload);
        console.log("email subject", emailMessage.subject);
        console.log("email body", emailMessage.body);
      }

      showAlert("送信しました。ありがとうございました。", "success");
      form.reset();
      form.classList.remove("was-validated");
      syncDelinquencyPeriodVisibility();
    } catch (error) {
      showAlert("送信に失敗しました。時間をおいて再度お試しください。", "danger");
    }
  });
}
