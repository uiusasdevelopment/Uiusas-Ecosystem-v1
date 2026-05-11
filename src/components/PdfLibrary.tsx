'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BookOpen, Upload, Trash2, Download, Search, FileText, Loader2, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, LayoutList, Maximize, Minimize } from 'lucide-react';
import { UserProfile } from '@/app/page';
import { motion, AnimatePresence } from 'framer-motion';

interface PdfLibraryProps {
  userProfile: UserProfile | null;
  isAdmin: boolean;
}

interface PdfRecord {
  id: string;
  title: string;
  period: string;
  subject: string;
  pdf_url: string;
  cover_url: string;
  created_at: string;
}

const PERIODS = Array.from({ length: 12 }, (_, i) => `P${i + 1}`);

// ====================================================
// MOTOR NATIVO DE PDF (Sem react-pdf / Sem Bugs SSR)
// ====================================================
function CustomPdfPage({ url, pageNum, scale }: { url: string, pageNum: number, scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let renderTask: any = null;
    let isActive = true;

    const renderPage = async () => {
      setLoading(true);
      try {
        // Importação dinâmica para blindar o Next.js de erros de SSR/Webpack
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale * 1.5 }); // Escala nativa melhorada para nitidez
        
        const canvas = canvasRef.current;
        if (!canvas || !isActive) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err) {
        if (isActive) console.error("Error rendering PDF page", err);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    renderPage();

    return () => {
      isActive = false;
      if (renderTask) renderTask.cancel();
    };
  }, [url, pageNum, scale]);

  return (
    <div className="relative flex justify-center items-center shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10 bg-white mb-8">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10 flex-col gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          <span className="text-[10px] text-cyan-500 tracking-widest font-bold">RENDERIZANDO...</span>
        </div>
      )}
      <canvas ref={canvasRef} className="w-auto h-auto max-w-full" style={{ width: `${scale * 100}%` }} />
    </div>
  );
}

export function PdfLibrary({ userProfile, isAdmin }: PdfLibraryProps) {
  const [pdfs, setPdfs] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  
  // Admin Upload State
  const [newTitle, setNewTitle] = useState('');
  const [newPeriod, setNewPeriod] = useState('P1');
  const [newSubject, setNewSubject] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Leitor de PDF (Custom)
  const [readingPdf, setReadingPdf] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'page' | 'scroll'>('page');
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');
  const readerRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchPdfs();
  }, []);

  const fetchPdfs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('library_pdfs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setPdfs(data);
    setLoading(false);
  };

  const generateCover = async (file: File): Promise<Blob | null> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
      });
    } catch (err) {
      console.error("Erro ao gerar capa:", err);
      return null;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newTitle || !newSubject) return;
    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `pdfs/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('uiusas_files').upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl: pdfUrl } } = supabase.storage.from('uiusas_files').getPublicUrl(filePath);

      let coverUrl = '';
      const coverBlob = await generateCover(selectedFile);
      if (coverBlob) {
        const coverPath = `covers/${fileName}.jpg`;
        const { error: coverError } = await supabase.storage.from('uiusas_files').upload(coverPath, coverBlob);
        if (!coverError) {
          coverUrl = supabase.storage.from('uiusas_files').getPublicUrl(coverPath).data.publicUrl;
        }
      }

      const { error: dbError } = await supabase.from('library_pdfs').insert({
        title: newTitle, period: newPeriod, subject: newSubject, pdf_url: pdfUrl, cover_url: coverUrl || 'fallback'
      });

      if (dbError) throw dbError;

      setSelectedFile(null);
      setNewTitle('');
      setNewSubject('');
      fetchPdfs();
    } catch (err) {
      console.error("Erro no upload", err);
      alert("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, pdfUrl: string, coverUrl: string) => {
    if (!confirm('Deseja purgar este arquivo do servidor?')) return;
    
    const pdfPath = pdfUrl.split('/uiusas_files/')[1];
    const coverPath = coverUrl.split('/uiusas_files/')[1];

    if (pdfPath) await supabase.storage.from('uiusas_files').remove([pdfPath]);
    if (coverPath && coverUrl !== 'fallback') await supabase.storage.from('uiusas_files').remove([coverPath]);

    await supabase.from('library_pdfs').delete().eq('id', id);
    fetchPdfs();
  };

  // Abre o PDF e busca o número total de páginas para os controles
  const openPdf = async (url: string) => {
    setReadingPdf(url);
    setPageNumber(1);
    setScale(1.0);
    setNumPages(0);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const pdf = await pdfjsLib.getDocument(url).promise;
      setNumPages(pdf.numPages);
    } catch (error) {
      console.error("Erro ao carregar PDF metadata:", error);
    }
  };

  const changePage = (offset: number) => {
    setPageNumber(prev => {
      const next = prev + offset;
      if (next < 1) return 1;
      if (numPages > 0 && next > numPages) return numPages;
      return next;
    });
  };

  useEffect(() => {
    setJumpPageInput(pageNumber.toString());
  }, [pageNumber]);

  const handleJumpPage = () => {
    const val = parseInt(jumpPageInput);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      setPageNumber(val);
    } else {
      setJumpPageInput(pageNumber.toString());
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      readerRef.current?.requestFullscreen().catch(err => {
        console.error("Erro ao ativar Fullscreen", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const uniqueSubjects = Array.from(new Set(pdfs.map(p => p.subject))).sort();
  const filteredPdfs = pdfs.filter(pdf => {
    const matchPeriod = filterPeriod === 'ALL' || pdf.period === filterPeriod;
    const matchSubject = filterSubject === 'ALL' || pdf.subject === filterSubject;
    return matchPeriod && matchSubject;
  });

  if (readingPdf) {
    return (
      <div ref={readerRef} className="absolute inset-0 bg-black z-50 flex flex-col font-mono animate-in fade-in duration-300">
        <div className="h-14 bg-zinc-950 border-b border-cyan-500/30 flex justify-between items-center px-4 shrink-0 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span className="font-bold tracking-widest text-xs text-cyan-400 hidden sm:inline-block">LEITOR TÁTICO</span>
            </div>

            <div className="flex bg-black/50 border border-white/10 rounded overflow-hidden">
              <button 
                onClick={() => setViewMode('page')}
                className={`px-3 py-1 text-[10px] tracking-widest flex items-center gap-1 transition-colors ${viewMode === 'page' ? 'bg-cyan-900 text-cyan-300' : 'text-zinc-500 hover:text-white'}`}
              >
                <Maximize2 className="w-3 h-3" /> <span className="hidden md:inline-block">PÁG</span>
              </button>
              <button 
                onClick={() => setViewMode('scroll')}
                className={`px-3 py-1 text-[10px] tracking-widest flex items-center gap-1 transition-colors ${viewMode === 'scroll' ? 'bg-cyan-900 text-cyan-300' : 'text-zinc-500 hover:text-white'}`}
              >
                <LayoutList className="w-3 h-3" /> <span className="hidden md:inline-block">SCROLL</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-2">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-[10px] text-zinc-500 w-8 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3.0, s + 0.2))} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <button onClick={toggleFullscreen} className="text-zinc-400 hover:text-white transition-colors" title="Tela Cheia">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <a href={readingPdf} target="_blank" download className="flex items-center gap-2 text-[10px] text-zinc-400 hover:text-white border border-white/10 px-3 py-1 hover:bg-white/5 transition-colors">
              <Download className="w-3 h-3" /> <span className="hidden sm:inline-block">BAIXAR</span>
            </a>
            <button onClick={() => setReadingPdf(null)} className="flex items-center gap-2 text-[10px] text-red-400 border border-red-500/30 px-3 py-1 hover:bg-red-950/50 hover:text-red-300 transition-colors">
              <X className="w-3 h-3" /> FECHAR
            </button>
          </div>
        </div>

        <div className="flex-1 w-full bg-[#141414] overflow-auto custom-scrollbar flex justify-center py-8 relative" style={{ perspective: '1500px' }}>
          <div className="flex flex-col items-center w-full">
            {numPages === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                <span className="text-[10px] text-cyan-500 tracking-widest">DECODIFICANDO ARQUIVO...</span>
              </div>
            ) : viewMode === 'page' ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={pageNumber}
                  initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: "blur(10px)", y: -20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-full flex justify-center"
                >
                  <CustomPdfPage url={readingPdf} pageNum={pageNumber} scale={scale} />
                </motion.div>
              </AnimatePresence>
            ) : (
              Array.from(new Array(numPages), (_, index) => (
                <div key={`page_${index + 1}`} className="relative">
                  <CustomPdfPage url={readingPdf} pageNum={index + 1} scale={scale} />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 text-[9px] text-zinc-500 rounded pointer-events-none z-20">
                    PÁG {index + 1}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {viewMode === 'page' && numPages > 0 && (
          <div className="h-16 bg-zinc-950 border-t border-cyan-500/20 flex justify-center items-center shrink-0 shadow-[0_-10px_30px_rgba(34,211,238,0.05)]">
            <div className="flex items-center gap-6 bg-black/60 border border-cyan-500/30 px-4 py-2 rounded-lg">
              
              <button disabled={pageNumber <= 1} onClick={() => changePage(-1)} className="p-2 rounded hover:bg-cyan-900/50 disabled:opacity-30 transition-colors text-cyan-400">
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest hidden sm:inline-block">PÁG</span>
                <input 
                  type="number" 
                  min={1} 
                  max={numPages} 
                  value={jumpPageInput} 
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJumpPage()}
                  onBlur={handleJumpPage}
                  className="w-14 bg-black border border-cyan-500/50 text-cyan-300 text-center text-[12px] font-bold py-1 outline-none focus:border-cyan-400 rounded hide-number-spinners"
                />
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest">/ {numPages}</span>
              </div>

              <button disabled={pageNumber >= numPages} onClick={() => changePage(1)} className="p-2 rounded hover:bg-cyan-900/50 disabled:opacity-30 transition-colors text-cyan-400">
                <ChevronRight className="w-5 h-5" />
              </button>

            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in zoom-in-95 duration-500">
      
      <div className="border border-white/10 bg-black/40 p-6 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
        <h1 className="text-xl md:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 mb-2">
          ACERVO UIUSASPEDIA
        </h1>
        <p className="text-xs text-zinc-400 tracking-widest">BIBLIOTECA CENTRAL DE PDFS E APOSTILAS DA ACADEMIA.</p>
      </div>

      {isAdmin && (
        <div className="border border-fuchsia-500/30 bg-fuchsia-950/20 p-6 flex flex-col gap-4">
          <h2 className="text-fuchsia-400 text-xs tracking-widest font-bold flex items-center gap-2 border-b border-fuchsia-500/20 pb-2">
            <Upload className="w-4 h-4" /> CENTRAL DE UPLOAD (ADMIN)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-zinc-500 tracking-widest">NOME DO MATERIAL</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-black border border-white/20 text-white text-xs p-2 focus:outline-none focus:border-fuchsia-500" placeholder="Ex: Resumo Anat." />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-zinc-500 tracking-widest">PERÍODO</label>
              <select value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} className="bg-black border border-white/20 text-white text-xs p-2 focus:outline-none focus:border-fuchsia-500">
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-zinc-500 tracking-widest">CADEIRA (MATÉRIA)</label>
              <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="bg-black border border-white/20 text-white text-xs p-2 focus:outline-none focus:border-fuchsia-500" placeholder="Ex: Farmacologia" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-zinc-500 tracking-widest">ARQUIVO (.PDF)</label>
              <input type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-fuchsia-900 file:text-fuchsia-200 hover:file:bg-fuchsia-800 cursor-pointer" />
            </div>
          </div>

          <button onClick={handleUpload} disabled={!selectedFile || !newTitle || !newSubject || uploading} className="mt-2 w-full py-3 bg-fuchsia-900/40 border border-fuchsia-500 text-fuchsia-300 text-xs font-bold tracking-widest hover:bg-fuchsia-800 disabled:opacity-50 flex justify-center items-center gap-2 transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'ENCRIPTANDO NO COFRE...' : 'ENVIAR MATERIAL'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-zinc-500 tracking-widest flex items-center gap-2"><Search className="w-3 h-3" /> FILTRAR POR PERÍODO</span>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button onClick={() => setFilterPeriod('ALL')} className={`px-4 py-1 text-xs tracking-widest border shrink-0 ${filterPeriod === 'ALL' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-transparent border-white/10 text-zinc-500 hover:text-white'}`}>TODOS</button>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setFilterPeriod(p)} className={`px-4 py-1 text-xs tracking-widest border shrink-0 ${filterPeriod === p ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-transparent border-white/10 text-zinc-500 hover:text-white'}`}>{p}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-zinc-500 tracking-widest flex items-center gap-2"><BookOpen className="w-3 h-3" /> FILTRAR POR MATÉRIA</span>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            <button onClick={() => setFilterSubject('ALL')} className={`px-4 py-1 text-xs tracking-widest border shrink-0 ${filterSubject === 'ALL' ? 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-300' : 'bg-transparent border-white/10 text-zinc-500 hover:text-white'}`}>TODAS</button>
            {uniqueSubjects.map(s => (
              <button key={s} onClick={() => setFilterSubject(s)} className={`px-4 py-1 text-xs tracking-widest border shrink-0 ${filterSubject === s ? 'bg-fuchsia-900/50 border-fuchsia-500 text-fuchsia-300' : 'bg-transparent border-white/10 text-zinc-500 hover:text-white'}`}>{s.toUpperCase()}</button>
            ))}
            {uniqueSubjects.length === 0 && <span className="text-[10px] text-zinc-600">NENHUMA MATÉRIA CADASTRADA.</span>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>
      ) : filteredPdfs.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 flex flex-col items-center">
          <BookOpen className="w-8 h-8 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-xs tracking-widest">NENHUM REGISTRO ENCONTRADO NO BANCO DE DADOS.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredPdfs.map(pdf => (
            <div key={pdf.id} className="group relative bg-black border border-white/10 flex flex-col hover:border-cyan-500/50 transition-colors shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <div onClick={() => openPdf(pdf.pdf_url)} className="w-full aspect-[1/1.4] bg-zinc-900 relative cursor-pointer overflow-hidden flex items-center justify-center">
                {pdf.cover_url && pdf.cover_url !== 'fallback' ? (
                  <img src={pdf.cover_url} alt="Capa" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                ) : <FileText className="w-12 h-12 text-zinc-700" />}
                <div className="absolute inset-0 bg-cyan-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-black/80 border border-cyan-500 text-cyan-300 text-[10px] font-bold tracking-widest px-4 py-2">ABRIR LEITOR</span>
                </div>
              </div>

              <div className="p-3 border-t border-white/10 flex flex-col gap-1">
                <span className="text-[9px] text-cyan-500 tracking-widest font-bold">{pdf.period} // {pdf.subject.toUpperCase()}</span>
                <h3 className="text-xs text-white font-bold line-clamp-2 leading-tight" title={pdf.title}>{pdf.title}</h3>
              </div>

              {isAdmin && (
                <button onClick={() => handleDelete(pdf.id, pdf.pdf_url, pdf.cover_url)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-950 border border-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-900 hover:scale-110 transition-all z-10" title="Purgar Arquivo">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
