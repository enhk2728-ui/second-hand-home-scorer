import type { PropertyRecord, PropertyScore } from "../domain/types";

interface PropertyListProps {
  properties: PropertyRecord[];
  scores: PropertyScore[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function PropertyList({ properties, scores, selectedId, onSelect, onAdd, onEdit, onDelete }: PropertyListProps) {
  const scoreById = new Map(scores.map((score) => [score.propertyId, score]));

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Properties</p>
          <h2>房源列表</h2>
        </div>
        <button className="primary-button" type="button" onClick={onAdd}>
          新增房源
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>房源</th>
              <th>位置</th>
              <th>总价</th>
              <th>面积</th>
              <th>单价</th>
              <th>综合分</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => {
              const score = scoreById.get(property.id);
              return (
                <tr key={property.id} className={selectedId === property.id ? "selected-row" : ""}>
                  <td>
                    <button className="link-button" type="button" onClick={() => onSelect(property.id)}>
                      {property.name}
                    </button>
                  </td>
                  <td>{property.address || "-"}</td>
                  <td>{property.totalPrice || "-"}</td>
                  <td>{property.area || "-"}</td>
                  <td>{property.unitPrice || "-"}</td>
                  <td>{score?.eliminated ? "-" : score?.totalScore ?? "-"}</td>
                  <td>{score?.eliminated ? "淘汰" : "正常"}</td>
                  <td>
                    <div className="button-group">
                      <button className="ghost-button" type="button" onClick={() => onEdit(property.id)}>
                        编辑
                      </button>
                      <button className="ghost-button danger-button" type="button" onClick={() => onDelete(property.id)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
