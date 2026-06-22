import { useState, useCallback } from "react";
import { AlertTriangle, BookOpen, CheckCircle, Info, X } from "lucide-react";
import { markOnboardingSeen } from "../domain/stateMigration";

export type MigrationChoice = "keep" | "merge" | "reset" | null;

interface OnboardingGuideProps {
  showMigrationPrompt: boolean;
  missingCount: number;
  onComplete: (choice: MigrationChoice) => void;
}

type Step = "disclaimer" | "tutorial" | "migration";

export function OnboardingGuide({ showMigrationPrompt, missingCount, onComplete }: OnboardingGuideProps) {
  const [step, setStep] = useState<Step>("disclaimer");
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleClose = useCallback(() => {
    markOnboardingSeen();
    onComplete(null);
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (step === "disclaimer") {
      setStep("tutorial");
    } else if (step === "tutorial") {
      if (showMigrationPrompt) {
        setStep("migration");
      } else {
        markOnboardingSeen();
        onComplete(null);
      }
    }
  }, [step, showMigrationPrompt, onComplete]);

  const handleMigrationChoice = useCallback(
    (choice: MigrationChoice) => {
      if (choice === "reset" && !resetConfirm) {
        setResetConfirm(true);
        return;
      }
      markOnboardingSeen();
      onComplete(choice);
    },
    [resetConfirm, onComplete],
  );

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-step-badge">{"第 "}{step === "disclaimer" ? "1" : step === "tutorial" ? "2" : "3"}{"/"}{showMigrationPrompt ? "3" : "2"} 步</span>
            <h2 className="modal-title">
              {step === "disclaimer" && "风险声明与免责"}
              {step === "tutorial" && "快速上手指南"}
              {step === "migration" && "指标升级"}
            </h2>
          </div>
          <button className="modal-close" type="button" onClick={handleClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {step === "disclaimer" && (
            <div className="onboarding-content">
              <div className="onboarding-icon-row">
                <AlertTriangle size={24} className="icon-warning" />
                <span className="onboarding-icon-label">重要声明</span>
              </div>
              <ul className="onboarding-list">
                <li>本工具是<b>二手房比较与决策辅助</b>工具，不构成购房、金融、法律或税务建议。</li>
                <li>请自行核实产权、贷款、税费、学区/政策、房屋质量和交易风险。</li>
                <li>如有疑问，请咨询持牌专业人士（房产律师、贷款经纪人、税务顾问等）。</li>
                <li>所有数据仅保存在当前浏览器 <code>localStorage</code>，不会上传至任何服务器。</li>
                <li>清除浏览器数据将导致评分数据丢失，请定期导出 JSON 备份。</li>
              </ul>
              <div className="onboarding-acknowledge">
                <CheckCircle size={16} />
                <span>我已阅读并理解上述声明</span>
              </div>
            </div>
          )}

          {step === "tutorial" && (
            <div className="onboarding-content">
              <div className="onboarding-icon-row">
                <BookOpen size={24} className="icon-info" />
                <span className="onboarding-icon-label">基本流程</span>
              </div>
              <ol className="onboarding-steps">
                <li>
                  <strong>录入房源</strong>
                  <span>— 填写名称、位置、总价、面积等基本信息。</span>
                </li>
                <li>
                  <strong>选择/调整指标</strong>
                  <span>— 在「指标」页面查看或自定义评估维度。默认已包含 {21} 项指标，覆盖位置、价格、房屋本体、小区物业和风险管理。</span>
                </li>
                <li>
                  <strong>设置权重</strong>
                  <span>— 使用 AHP 权重配置（等权 / 重要性排序 / 手动判断矩阵）确定各指标权重。</span>
                </li>
                <li>
                  <strong>统一打分</strong>
                  <span>— 在「打分」页面逐项评分，硬伤指标勾选后房源自动淘汰。</span>
                </li>
                <li>
                  <strong>查看排序</strong>
                  <span>— 在「结果」页面查看综合排名、雷达图、热力图和淘汰列表。</span>
                </li>
                <li>
                  <strong>导出备份</strong>
                  <span>— 使用顶部工具栏导出 JSON 或 CSV，便于存档和分享。</span>
                </li>
              </ol>
              {showMigrationPrompt && (
                <div className="onboarding-notice">
                  <Info size={16} />
                  <span>检测到旧版指标数据。旧用户可能看不到新增指标，将在下一步处理。</span>
                </div>
              )}
            </div>
          )}

          {step === "migration" && (
            <div className="onboarding-content">
              <div className="onboarding-icon-row">
                <Info size={24} className="icon-info" />
                <span className="onboarding-icon-label">发现 {missingCount} 个新版默认指标不在您的当前配置中</span>
              </div>
              <p className="muted">
                这是因为您之前使用过旧版本，浏览器本地存储了旧的指标配置。
                请选择以下处理方式：
              </p>
              <div className="migration-choices">
                <button
                  className="migration-choice"
                  type="button"
                  onClick={() => handleMigrationChoice("merge")}
                >
                  <div className="migration-choice-header">
                    <span className="migration-choice-title">合并新版默认指标</span>
                    <span className="badge badge-recommend">推荐</span>
                  </div>
                  <span className="migration-choice-desc">
                    将缺失的 {missingCount} 个默认指标追加到现有指标末尾。保留您的所有数据、房源和自定义设置。
                  </span>
                </button>
                <button
                  className="migration-choice"
                  type="button"
                  onClick={() => handleMigrationChoice("keep")}
                >
                  <div className="migration-choice-header">
                    <span className="migration-choice-title">保留现有指标</span>
                  </div>
                  <span className="migration-choice-desc">
                    继续使用当前指标配置。您可以稍后手动在「指标」页面调整。
                  </span>
                </button>
                <button
                  className="migration-choice migration-choice-danger"
                  type="button"
                  onClick={() => handleMigrationChoice("reset")}
                >
                  <div className="migration-choice-header">
                    <span className="migration-choice-title">
                      {resetConfirm ? "确认重置为新版示例？此操作不可撤销。" : "重置为新版示例数据"}
                    </span>
                  </div>
                  <span className="migration-choice-desc">
                    使用新版默认指标和示例房源。您当前的浏览器数据将被覆盖。
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === "migration" ? (
            <button className="ghost-button" type="button" onClick={handleClose}>
              跳过
            </button>
          ) : (
            <>
              <button className="ghost-button" type="button" onClick={handleClose}>
                跳过引导
              </button>
              <button className="primary-button" type="button" onClick={handleNext}>
                {step === "disclaimer" ? "继续" : showMigrationPrompt ? "下一步" : "完成"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
