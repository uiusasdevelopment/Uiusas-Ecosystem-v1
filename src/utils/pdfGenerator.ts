export function generatePDFContent(
  questionsToExport: any[],
  documentTitle: string = 'Acervo UIUSAS',
  subtitle: string = 'MATRIZ DE DADOS'
) {
  const w = window.open('', '_blank');
  if (!w) { alert('Popup bloqueado. Permita popups para gerar o PDF.'); return; }
  
  const db = (d: string) => d==='Difícil'?'background:linear-gradient(135deg,#be123c,#e11d48);color:#fff;':d==='Média'?'background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;':'background:linear-gradient(135deg,#0284c7,#38bdf8);color:#fff;';
  
  const qh = questionsToExport.map((q, i) => {
    const opts = q.options ? q.options.filter((o: any) => o && o.trim() !== '') : [];
    return '<div style="break-inside:avoid;background:#fff;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">'
      +'<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">'
      +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:900;font-size:14px;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;">'+(i+1)+'</div>'
      +'<span style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:#f3f4f6;color:#374151;padding:4px 10px;border-radius:6px;border:1px solid #e5e7eb;">'+(q.subject || 'S/ MATÉRIA')+'</span>'
      +'<span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:#f0fdf4;color:#166534;padding:4px 10px;border-radius:6px;border:1px solid #bbf7d0;">'+(q.topic || 'S/ TÓPICO')+'</span>'
      +'<span style="font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:6px;'+db(q.difficulty || 'Média')+'">'+(q.difficulty || 'Média')+'</span>'
      +'</div>'
      +'<p style="font-size:14px;line-height:1.75;color:#1f2937;margin:0 0 16px 0;">'+(q.question_text || '')+'</p>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      +opts.map((o: any, j: number) => {
        const prefix = q.type === 'TRUE_FALSE' ? ['I','II','III','IV','V'][j] : ['A','B','C','D','E'][j];
        return '<div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;line-height:1.5;"><span style="font-weight:800;color:#6b7280;min-width:20px;">'+prefix+')</span><span style="color:#374151;">'+o+'</span></div>';
      }).join('')
      +'</div></div>';
  }).join('');

  const gh = questionsToExport.map((q, i) => {
    let rightAnswerStr = '';
    if (q.type === 'TRUE_FALSE') {
      rightAnswerStr = (q.correct_answer || '').split('').map((val: string, index: number) => `<span>${['I','II','III','IV','V'][index]}-${val}</span>`).join(', ');
    } else {
      rightAnswerStr = ['A','B','C','D','E'][parseInt(q.correct_answer)] || q.correct_answer;
    }
    
    return '<div style="break-inside:avoid;background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:12px;border:1px solid #e5e7eb;display:flex;gap:16px;align-items:flex-start;">'
      +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:900;font-size:12px;min-width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">'+(i+1)+'</div>'
      +'<div style="flex:1;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'
      +'<span style="font-size:12px;font-weight:700;color:#374151;">Resposta:</span>'
      +'<span style="background:#059669;color:#fff;font-weight:900;font-size:13px;padding:2px 12px;border-radius:6px;letter-spacing:2px;">'+rightAnswerStr+'</span>'
      +'<span style="font-size:10px;color:#9ca3af;">'+(q.topic || '')+'</span>'
      +'</div></div></div>';
  }).join('');

  const dt = new Date().toLocaleDateString('pt-BR');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+documentTitle+'</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">'
    +'<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Inter,Arial,sans-serif;background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact;}@media print{body{background:#fff;}}@page{margin:15mm;}</style>'
    +'</head><body>'
    +'<div style="background:linear-gradient(135deg,#064e3b,#059669,#0d9488);border-radius:20px;padding:40px 32px;margin-bottom:32px;color:#fff;position:relative;overflow:hidden;">'
    +'<div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>'
    +'<div style="position:relative;z-index:1;">'
    +'<div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;opacity:0.7;margin-bottom:8px;">' + documentTitle + '</div>'
    +'<h1 style="font-size:28px;font-weight:900;letter-spacing:2px;margin-bottom:4px;">'+subtitle+'</h1>'
    +'<div style="display:flex;gap:24px;margin-top:24px;flex-wrap:wrap;">'
    +'<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 16px;"><div style="font-size:9px;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">DATA</div><div style="font-size:14px;font-weight:700;">'+dt+'</div></div>'
    +'<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 16px;"><div style="font-size:9px;letter-spacing:2px;opacity:0.7;margin-bottom:2px;">TOTAL</div><div style="font-size:14px;font-weight:700;">'+questionsToExport.length+'</div></div>'
    +'</div></div></div>'
    +qh
    +'<div style="break-before:page;">'
    +'<div style="background:linear-gradient(135deg,#064e3b,#059669);border-radius:16px;padding:24px 28px;margin-bottom:24px;color:#fff;">'
    +'<h2 style="font-size:20px;font-weight:900;letter-spacing:2px;">GABARITO</h2></div>'
    +gh
    +'</div></body></html>');
  w.document.close();
  setTimeout(() => w.print(), 600);
}
