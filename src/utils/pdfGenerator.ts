import { jsPDF } from "jspdf";
import { researchAsMarkdown, type ResearchReport } from '../../shared/research';

interface Section {
  startTime: string;
  type: string;
  description: string;
  instruments: string;
  vibe: string;
  melody: string;
  isUnsure: boolean;
}

interface GlobalMetadata {
  genreEraSceneTags?: string;
  genreEraScene?: string;
  tempoRhythmGrooveTags?: string;
  tempoRhythmGroove?: string;
  harmonyChordsKeyTags?: string;
  harmonyChordsKey?: string;
  instrumentationTags?: string;
  instrumentation?: string;
  playingStyleTags?: string;
  playingStyle?: string;
  wowFactorTags?: string;
  wowFactor?: string;
  emotionVibeSettingTags?: string;
  emotionVibeSetting?: string;
  mixTags?: string;
  mix?: string;
  fidelityTags?: string;
  fidelity?: string;
  vocalTags?: string;
  vocal?: string;
  lyricsTags?: string;
  lyrics?: string;
}

export function generatePDF(
  fileName: string,
  durationStr: string,
  globalMetadata: GlobalMetadata,
  sections: Section[],
  research?: ResearchReport
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin + 10;
      drawHeaderFooter();
    }
  };

  const drawHeaderFooter = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(140, 120, 95); // Deep accent color matching theme
    doc.text("MUSIC ANNOTATION & SPECTRAL ANALYSIS REPORT", margin, 12);
    
    doc.setDrawColor(220, 210, 195);
    doc.setLineWidth(0.3);
    doc.line(margin, 14, pageWidth - margin, 14);

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.text(`Page ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    doc.text("GENERATED VIA AI STUDIO TRANSCRIPTION WORKSPACE", margin, pageHeight - 10);
  };

  // 1. COVER / HEADER BLOCK
  // Document title
  y = 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 30, 30);
  doc.text("AUDIO TRANSCRIPTION REPORT", margin, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`File: ${fileName}`, margin, y);
  
  y += 5;
  doc.text(`Track Duration: ${durationStr || "N/A"}`, margin, y);
  
  y += 5;
  doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, margin, y);

  y += 12;
  doc.setDrawColor(215, 183, 139); // Theme accent border
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  
  y += 10;

  // Draw first page header/footer
  drawHeaderFooter();

  // 2. GLOBAL MUSICAL MATRIX SECTION
  checkPageBreak(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(140, 120, 95);
  doc.text("GLOBAL MUSICAL MATRIX", margin, y);
  y += 8;

  const globalFields = [
    { label: "Genre, Era & Scene Tags", value: globalMetadata.genreEraSceneTags },
    { label: "Genre, Era & Scene", value: globalMetadata.genreEraScene },
    { label: "Tempo, Rhythm & Groove Tags", value: globalMetadata.tempoRhythmGrooveTags },
    { label: "Tempo, Rhythm & Groove", value: globalMetadata.tempoRhythmGroove },
    { label: "Harmony, Chords & Key Tags", value: globalMetadata.harmonyChordsKeyTags },
    { label: "Harmony, Chords & Key", value: globalMetadata.harmonyChordsKey },
    { label: "Instrumentation Tags", value: globalMetadata.instrumentationTags },
    { label: "Instrumentation", value: globalMetadata.instrumentation },
    { label: "Playing Style Tags", value: globalMetadata.playingStyleTags },
    { label: "Playing Style", value: globalMetadata.playingStyle },
    { label: "Wow Factor Tags", value: globalMetadata.wowFactorTags },
    { label: "Wow Factor", value: globalMetadata.wowFactor },
    { label: "Emotion, Vibe & Setting Tags", value: globalMetadata.emotionVibeSettingTags },
    { label: "Emotion, Vibe & Setting", value: globalMetadata.emotionVibeSetting },
    { label: "Mix & Production Tags", value: globalMetadata.mixTags },
    { label: "Mix & Production", value: globalMetadata.mix },
    { label: "Sonic Fidelity Tags", value: globalMetadata.fidelityTags },
    { label: "Sonic Fidelity", value: globalMetadata.fidelity },
    { label: "Vocal Expression Tags", value: globalMetadata.vocalTags },
    { label: "Vocal Expression", value: globalMetadata.vocal },
    { label: "Lyrical Evocation Tags", value: globalMetadata.lyricsTags },
    { label: "Lyrical Evocation", value: globalMetadata.lyrics },
  ];

  globalFields.forEach((field) => {
    if (!field.value) return;

    // Estimate height needed
    const labelLines = doc.splitTextToSize(`${field.label}:`, contentWidth);
    // Keep compact citation markers here; full source URLs appear in research.
    const readableValue = field.value.replace(/\[([^\]]+)\]\(<?([^)>]+)>?\)/g, '[$1]');
    const valueLines = doc.splitTextToSize(readableValue, contentWidth - 10);
    const totalLines = labelLines.length + valueLines.length;
    const blockHeight = totalLines * 4.5 + 4;

    checkPageBreak(blockHeight);

    // Render Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`${field.label}:`, margin, y);
    y += 4;

    // Render Value
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    valueLines.forEach((line: string) => {
      doc.text(line, margin + 4, y);
      y += 4;
    });

    y += 2; // small spacer between fields
  });

  y += 6;

  // 3. TIMELINE SECTIONS
  checkPageBreak(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(140, 120, 95);
  doc.text("TIMELINE SECTIONS REPORT", margin, y);
  y += 8;

  sections.forEach((section, index) => {
    // Layout of each section
    // Title row: Start Time | Section Type
    // Fields: Vibe, Melody, Instruments, Narrative Description
    const labelHeight = 4.5;
    
    // Split texts to calculate heights
    const vibeLines = section.vibe ? doc.splitTextToSize(`Vibe: ${section.vibe}`, contentWidth) : [];
    const melodyLines = section.melody ? doc.splitTextToSize(`Melody: ${section.melody}`, contentWidth) : [];
    const instLines = section.instruments ? doc.splitTextToSize(`Instruments: ${section.instruments}`, contentWidth) : [];
    const descLines = section.description ? doc.splitTextToSize(`Description: ${section.description}`, contentWidth) : [];

    const sectionContentHeight = 
      6 + // Title block
      (vibeLines.length * labelHeight) + 
      (melodyLines.length * labelHeight) + 
      (instLines.length * labelHeight) + 
      (descLines.length * labelHeight) +
      10; // Spacing

    checkPageBreak(sectionContentHeight);

    // Draw section background container border
    doc.setDrawColor(240, 235, 225);
    doc.setLineWidth(0.4);
    doc.rect(margin - 2, y - 4, contentWidth + 4, sectionContentHeight - 6);

    // Draw segment title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(215, 183, 139); // Deep gold/brown accent
    doc.text(`[${section.startTime}]  ${section.type.toUpperCase()}`, margin, y);
    y += 5.5;

    // Vibe
    if (vibeLines.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text("Vibe: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      
      const vibeOnly = section.vibe;
      const wrappedVibe = doc.splitTextToSize(vibeOnly, contentWidth - 12);
      wrappedVibe.forEach((line: string, i: number) => {
        doc.text(line, margin + 12, y + (i * labelHeight));
      });
      y += wrappedVibe.length * labelHeight;
    }

    // Melody
    if (melodyLines.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text("Melody: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);

      const melodyOnly = section.melody;
      const wrappedMelody = doc.splitTextToSize(melodyOnly, contentWidth - 15);
      wrappedMelody.forEach((line: string, i: number) => {
        doc.text(line, margin + 15, y + (i * labelHeight));
      });
      y += wrappedMelody.length * labelHeight;
    }

    // Instruments
    if (instLines.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text("Instruments: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);

      const instOnly = section.instruments;
      const wrappedInst = doc.splitTextToSize(instOnly, contentWidth - 22);
      wrappedInst.forEach((line: string, i: number) => {
        doc.text(line, margin + 22, y + (i * labelHeight));
      });
      y += wrappedInst.length * labelHeight;
    }

    // Narrative Description
    if (descLines.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text("Narrative: ", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);

      const descOnly = section.description;
      const wrappedDesc = doc.splitTextToSize(descOnly, contentWidth - 18);
      wrappedDesc.forEach((line: string, i: number) => {
        doc.text(line, margin + 18, y + (i * labelHeight));
      });
      y += wrappedDesc.length * labelHeight;
    }

    y += 8; // spacing between segments
  });

  if (research) {
    doc.addPage();
    y = margin + 10;
    drawHeaderFooter();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Google Search research', margin, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const researchText = researchAsMarkdown(research).replace(/^\s*## Google Search research\s*/, '')
      .replace(/\[([^\]]+)\]\(<?([^)>]+)>?\)/g, '$1 ($2)');
    for (const line of doc.splitTextToSize(researchText, contentWidth)) {
      checkPageBreak(5);
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(line, margin, y);
      y += 5;
    }
  }

  // Save the document
  const safeName = fileName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_music_annotation_report.pdf`);
}
