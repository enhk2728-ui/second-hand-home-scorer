import type { PropertyRecord } from "../domain/types";

interface PropertyFormProps {
  property: PropertyRecord;
  onChange: (property: PropertyRecord) => void;
  onSave: () => void;
}

export function PropertyForm({ property, onChange, onSave }: PropertyFormProps) {
  function updateBase<K extends keyof PropertyRecord>(key: K, value: PropertyRecord[K]) {
    const next = { ...property, [key]: value, updatedAt: new Date().toISOString() };
    if ((key === "totalPrice" || key === "area") && Number(next.totalPrice) > 0 && Number(next.area) > 0) {
      next.unitPrice = Math.round((Number(next.totalPrice) / Number(next.area)) * 100) / 100;
    }
    onChange(next);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Entry</p>
          <h2>房源录入</h2>
        </div>
      </div>

      <p className="muted">录入房源基本信息后，请到「打分」页面对各指标进行统一打分。</p>

      <div className="form-grid">
        <label>
          房源名称
          <input value={property.name} onChange={(event) => updateBase("name", event.target.value)} />
        </label>
        <label>
          位置
          <input value={property.address} onChange={(event) => updateBase("address", event.target.value)} />
        </label>
        <label>
          总价（万）
          <input type="number" value={property.totalPrice} onChange={(event) => updateBase("totalPrice", Number(event.target.value) || "")} />
        </label>
        <label>
          面积（m²）
          <input type="number" value={property.area} onChange={(event) => updateBase("area", Number(event.target.value) || "")} />
        </label>
        <label>
          单价（元/m²）
          <input type="number" value={property.unitPrice} onChange={(event) => updateBase("unitPrice", Number(event.target.value) || "")} />
        </label>
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="primary-button" type="button" onClick={onSave}>
          保存
        </button>
      </div>
    </section>
  );
}
