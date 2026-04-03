import './PrintButton.css';

export function PrintButton() {
  return (
    <button className="print-btn" onClick={() => window.print()} aria-label="印刷">
      🖨 印刷
    </button>
  );
}
