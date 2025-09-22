import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LessonSlide, CheckResults, ActionableError } from '../types';
import { parseMarkdownToLesson } from '../services/parser';
import { useUndoableState, findRange, replaceRange } from '../services/utils/textRanges';
import { MarkdownView } from './MarkdownView';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToggleSwitch } from './ToggleSwitch';
import { Spinner } from './Spinner';
import { runChecks } from '../services/openrouterService';
import { usePrompts } from '../contexts/PromptsContext';
import { useModel } from '../contexts/ModelContext';
import { useDebug } from '../contexts/DebugContext';
import { CheckResultsPanel } from './CheckResultsPanel';
import { AIChatPanel } from './AIChatPanel';

const INITIAL_MARKDOWN = `# Lektion

## Folie 1

# Sensor Entwicklung

Du bist frisch ins **Eintwicklungs**-Team berufen worden. Dein Auftrag: Entwickle eine kompakte **Sensoreinheit** für die nächste Generation von Smart-Factory-Modulen. Der nächste Schritt ist die Integration eines **Temperatursensor** an die Einheit.

<image>Vor einem dunkelblauen Hintergrund sind zwei Roboterarme zu sehen. Der linke rote Roboterarm hält eine graue Platte fest. Der rechte hellblaue Roboterarm ist ein Bunsenbrenner, dessen blaue Flamme die Platte erhitzt, sodass diese orange und rot glüht. Ein weiß-roter Infrarot-Temperatursensor, ist auf die glühende Platte gerichtet und zeigt einen Messwert von 768,8 Grad Celsius an.</image>



## Folie 2

# Wähle aus

Mit einem **Oszilloskop** misst du das **Ausgangssignal** des Sensors.

<image>Ein weißes digitales Oszilloskop vor einem dunkelblauen Hintergrund. Auf dem Bildschirm des Oszilloskops ist ein Diagramm mit einem roten, wellenförmigen Graphen auf einem schwarzen Gitter mit feinen weißen Linien zu sehen. Rechts vom Bildschirm befinden sich mehrere Drehknöpfe und Tasten in verschiedenen Farben.</image>

Wie lässt sich das **Signal** am besten **beschreiben**?

- [x] Ein durchgehender Verlauf, der sich stetig verändert



## Folie 3

# Wähle aus

Du schließt den Temperatursensor korrekt an.  
Das **Oszilloskop** zeigt weiterhin ein schönes, **kontinuierliches** Signal. Der Mikrocontroller hingegen gibt nur **wirre** **Werte** aus.

Was könnte das **Problem** sein?

- [ ] Der Sensor ist defekt.

- [ ] Der Mikrocontroller kann keine Temperaturen messen.

- [x] Der Mikrocontroller kann mit dem kontinuierlichen Signal nichts anfangen.



## Folie 4

# Analog vs. Digital

**Analoge Signale**

  * Verlaufen **kontinuierlich**
  * Können **jeden Zwischenwert** annehmen
  * Beispiel: Spannungsverlauf als **glatte** Kurve

**Digitale Signale**

  * Bestehen aus **klar abgegrenzten Stufen**
  * Nur **bestimmte Werte** sind möglich (z. B. 0 und 1)

<image>Die Illustration vergleicht ein analoges und ein digitales Signal anhand zweier Diagramme. Das obere Diagramm zeigt ein analoges Signal mit einer kontinuierlich verlaufenden Kurve, die sich über die Zeit t verändert. Das untere Diagramm stellt ein digitales Signal dar, das zwischen diskreten Zuständen wechselt, dargestellt durch Pegel von 0 und 1. Beide Diagramme haben eine Spannungsskala U auf der vertikalen Achse und eine Zeitachse t auf der horizontalen Achse.</image>



## Folie 5

# Ordne zu

Welches **Element** arbeitet mit welchem **Signal** aus?

| **Mikrocontroller** | **Temperatursensor** |
| --- | --- |
| - [x] Digital | - [x] Analog |



## Folie 6

# A/D-Wandler

Damit ein Mikrocontroller ein **analoges** Signal verarbeiten kann, muss es zuerst in ein **digitales** **Signal** umgewandelt werden.  
Diese Aufgabe übernimmt der **A/D-Wandler** (Analog-Digital-Wandler).

<image>Vor einem dunkelblauen Hintergrund sind drei Elemente nebeneinander dargestellt. Links befindet sich eine rote, sinusförmige Welle. In der Mitte ist ein schwarzer, rechteckiger Chip mit silbernen Anschlussbeinchen abgebildet. Auf dem Chip steht in großen, hellgrauen Buchstaben "A/D". Rechts davon ist ein hellblaues, rechteckiges Pulssignal zu sehen. Die Anordnung veranschaulicht die Umwandlung eines analogen Signals in ein digitales Signal durch einen Analog-Digital-Wandler (A/D-Wandler).</image>



## Folie 7

# Abtastung eines analogen Signals

Du lässt dir ein Testsignal **vor** und **nach** dem **A/D-Wandler** grafisch darstellen. 

<animation>Zweigeteilte Darstellung eines analogen Signals und seiner Abtastung. Im ersten Zustand zeigt ein Koordinatensystem eine kontinuierliche blaue Wellenlinie als 'Analoges Signal' über die Zeit. Im zweiten Zustand werden rote vertikale Linien und Punkte hinzugefügt, die das Signal zu diskreten Zeitpunkten abtasten und als 'Abgetastete Werte' kennzeichnen. Schaltflächen unterhalb wechseln von hervorgehobenem 'Analog' zu hervorgehobenem 'Abgetastet', um die Zustände zu verdeutlichen.</animation>



## Folie 8

# Wähle aus

Welche der folgenden **Aussagen** sind **wahr**?

_Hinweis: Mehrere Antworten können richtig sein._

- [x] Jeder rote Punkt stellt einen gemessenen Moment des analogen Signals dar.

- [x] Der A/D-Wandler erfasst regelmäßig den Signalwert zu einem bestimmten Zeitpunkt.

- [ ] Ein A/D-Wandler verstärkt das analoge Signal für den Mikrocontroller.

- [ ] Die roten Punkte zeigen ein digitales Ausgangssignal mit nur den Werten 0 und 1.



## Folie 9

# Abtastung

Ein Mikrocontroller kann **kein durchgehendes Signal** lesen. Deshalb misst der **A/D-Wandler** den **aktuellen Wert** des Signals in **festen Abständen**. Das ist die **Abtastung**.

<animation>Zweigeteilte Darstellung eines analogen Signals und seiner Abtastung. Im ersten Zustand zeigt ein Koordinatensystem eine kontinuierliche blaue Wellenlinie als 'Analoges Signal' über die Zeit. Im zweiten Zustand werden rote vertikale Linien und Punkte hinzugefügt, die das Signal zu diskreten Zeitpunkten abtasten und als 'Abgetastete Werte' kennzeichnen. Schaltflächen unterhalb wechseln von hervorgehobenem 'Analog' zu hervorgehobenem 'Abgetastet', um die Zustände zu verdeutlichen.</animation>



## Folie 10

# Plötzliche Temperaturwechsel

Ein **Induktionsmodul** in der Smart Factory erhitzt Werkstücke. Sie werden innerhalb von **Sekunden** erhitzt und wieder abgekühlt. Das Sensormodul soll diesen Prozess überwachen. Du stellst die Situation im Labor nach und der Mikrocontroller **rekonstruiert** das Signal:

<animation>Eine zweigeteilte Grafik, die ein Temperatursignal über die Zeit darstellt. Im ersten Zustand ('Signal') zeigt eine durchgezogene blaue Linie den kontinuierlichen Verlauf des Signals mit zwei deutlichen Peaks. Im zweiten Zustand ('Abtastung') werden rote vertikale Linien hinzugefügt, die das blaue Signal an diskreten Zeitpunkten abtasten. Die Endpunkte dieser Abtastungen sind durch eine gestrichelte rote Linie verbunden, die einen deutlich anderen Verlauf als das ursprüngliche blaue Signal zeigt. Die aktive Schaltfläche unterhalb wechselt entsprechend, um den Fokus entweder auf das kontinuierliche Signal oder seine abgetasteten und verbundenen Werte zu legen und den Unterschied in ihrem Verlauf zu verdeutlichen.</animation>



## Folie 11

# Wähle aus

Warum **weicht** das **Signal** so sehr vom eigentlichen Temperaturverlauf **ab**?

_Hinweis: Mehrere Antworten können richtig sein._

- [x] Zwischen den Messpunkten verändert sich die Temperatur stark.

- [x] Der Mikrocontroller bekommt zu wenig Informationen, um den echten Kurvenverlauf darzustellen.

- [ ] Der A/D-Wandler rechnet den Temperaturwert falsch um.

- [ ] Der Sensor funktioniert nicht richtig.



## Folie 12

# Wähle aus

Wie lässt sich das Problem beheben?

- [ ] Einen anderen Sensor mit höherem Temperaturbereich verwenden.

- [x] Die Abtastrate des A/D-Wandlers erhöhen.

- [ ] Das analoge Signal nach dem Sensor verstärken.

- [ ] Die Temperatur in der Anlage gleichmäßiger regeln.



## Folie 13

# Merke

**Abtastung** bedeutet, dass ein **analoges Signal** in **festen Zeitabständen** gemessen wird. Jeder einzelne Messwert wird vom **A/D-Wandler** in eine **Zahl** umgewandelt.

Wenn die **Abtastrate** hoch genug ist, kann der Verlauf des analogen Signals **genau erfasst** werden.

<animation>Die dreiteilige Grafik veranschaulicht den Einfluss der Abtastrate auf die Rekonstruktion eines kontinuierlichen Signals, hier einer Temperaturkurve über die Zeit. Im ersten Zustand, gekennzeichnet durch die hervorgehobene Schaltfläche 'Keine', ist lediglich das ursprüngliche, analoge Signal als durchgezogene blaue Linie mit zwei markanten Peaks dargestellt. Es erfolgt keine Abtastung. Der zweite Zustand, bei dem die Schaltfläche 'Niedrig' hervorgehoben ist, zeigt, wie dieses blaue Signal mit einer geringen Anzahl roter, vertikaler Linien abgetastet wird. Die Verbindung dieser wenigen Abtastpunkte durch eine gestrichelte rote Linie resultiert in einer groben Annäherung des ursprünglichen Signalverlaufs, die insbesondere bei schnellen Änderungen deutlich abweicht. Im dritten Zustand, hervorgehoben durch die Schaltfläche 'Hoch', wird das blaue Signal mit einer wesentlich größeren Anzahl roter, vertikaler Linien in kürzeren Zeitabständen abgetastet. Die resultierende gestrichelte rote Linie, die nun mehr Abtastpunkte verbindet, bildet eine deutlich präzisere Wiedergabe des ursprünglichen Signals. Die Grafik verdeutlicht somit, dass eine höhere Abtastrate zu einer genaueren Rekonstruktion des ursprünglichen Signals führt, während eine niedrige Abtastrate wesentliche Informationen verloren gehen lässt.</animation>



## Folie 14

# Präzise Messung

Der Prozess muss genau **überwacht** werden. Das heißt, der **Wandler** muss nicht nur schnell messen, sondern auch die Messwerte sehr präzise **übertragen**. Im Datenblatt findest du diese Daten dazu:

| **Parameter** | **Wert/Einheit** |
| --- | --- |
| Auflösung | 8 Bit |
| Genauigkeit | ±2 LSB |



## Folie 15

# Gib ein

Die Anzahl der Bits gibt an, in wie viele "Stufen" ein analoges Signal bei der Wandlung unterteilt wird.

In wie viele **Stufen** unterteilt der A/D-Wandler das Signal mit **4** bzw. **8 Bit**?

| **Anzahl Bits** | **Anzahl Stufen** |
| --- | --- |
| 1 | 2 |
| 2 | 4 |
| 3 | 8 |
| 4 | - [x] n = 16 |
| 8 | - [x] n = 256 |



## Folie 16

# Gib ein

Der Sensor misst Temperaturen von 20 °C bis 220 °C. Dieser Temperaturbereich von 200 °C wird in 256 Stufen unterteilt.

Wie groß ist eine **Stufe** in Grad Celsius?

*Hinweis: Runde auf zwei Nachkommastellen.*

- [x] n = 0.78



## Folie 17

# Gib ein

Als Nächstes schaust du auf die **Genauigkeit**: ±2 LSB. Sie gibt die größtmögliche Abweichung zwischen Eingangs- und Ausgangswert an. Der **LSB** (Least Significant Bit) ist die **kleinste** **messbare** Einheit, die der A/D-Wandler unterscheiden kann, also eine **Stufe** der **Auflösung**. In unserem Fall sind es **0,78 °C pro LSB.**

Wie **groß** ist der **mögliche** **Fehler** im Betrag bei ±2 LSB in °C?

- [x] n = 1.56



## Folie 18

# Wähle aus

Du sprichst mit dem Fertigungsteam: Das Ziel ist, **Temperaturabweichungen** von mehr als 5 °C zuverlässig zu erkennen.  
**Kleinere** Schwankungen sind für das Produkt **nicht** **kritisch**.

Wandelt der A/D-Wandler das Signal **ausreichend** **genau**?

- [x] Ja

- [ ] Nein



## Folie 19

# Auftrag erfüllt

Du hast die **Sensoreinheit** erfolgreich entwickelt:

  * Der Sensor liefert ein **analoges Signal**, das zuverlässig erfasst wird.
  * Der **A/D-Wandler** tastet das Signal mit passender **Abtastrate** ab.
  * Die **Auflösung** ist fein genug, um Temperaturänderungen differenziert darzustellen.
  * Die **Genauigkeit** des Systems reicht aus, um **kritische Abweichungen** zu erkennen.



## Folie 20

# Zusammenfassung

  * Sensoren liefern **analoge Signale**
  * Mikrocontroller verarbeiten **digitale Signale**
  * Der **A/D-Wandler** wandelt analog in digital
  * Die **Abtastrate** bestimmt, wie oft gemessen wird
  * Die **Auflösung** bestimmt die Schrittweite
  * Die **Genauigkeit** gibt die mögliche Abweichung an
`;

interface LessonSidebarProps {
  lessonTitle: string;
  slides: LessonSlide[];
  onSlideSelect: (slideId: string) => void;
  selectedSlideId: string | null;
  onCheckAllSlides: () => void;
  isChecking: boolean;
  checkResults: Record<string, CheckResults | null> | null;
  onPasteFromClipboard: () => void;
  onCopyToClipboard: () => void;
}

const StatusIndicator: React.FC<{ results: CheckResults | null | undefined }> = ({ results }) => {
  if (results === undefined || results === null) return null;
  const hasErrors = results.fachlich.length > 0 || results.sprachlich.length > 0 || results.guidelines.length > 0;
  return (
    <span
      className={`w-3 h-3 rounded-full flex-shrink-0 ${hasErrors ? 'bg-yellow-400' : 'bg-green-500'}`}
      title={hasErrors ? 'Fehler gefunden' : 'Geprüft & fehlerfrei'}
    ></span>
  );
};

const LessonSidebar: React.FC<LessonSidebarProps> = ({ lessonTitle, slides, onSlideSelect, selectedSlideId, onCheckAllSlides, isChecking, checkResults, onPasteFromClipboard, onCopyToClipboard }) => {
  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white truncate" title={lessonTitle}>{lessonTitle || 'Lektion'}</h1>
        <span className="text-sm text-gray-400">{slides.length} Folien geladen</span>
        <div className="mt-4 space-y-2">
          <button
            onClick={onCheckAllSlides}
            disabled={isChecking}
            className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {isChecking ? <Spinner /> : null}
            Alle Folien prüfen
          </button>
          <button
            onClick={onPasteFromClipboard}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            title="Inhalt aus der Zwischenablage einfügen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Einfügen
          </button>
          <button
            onClick={onCopyToClipboard}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
            title="Markdown in die Zwischenablage kopieren"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Kopieren
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2 space-y-1">
          {slides.map(slide => (
            <li key={slide.id}>
              <button
                onClick={() => onSlideSelect(slide.id)}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                  slide.id === selectedSlideId
                    ? 'bg-sky-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2" title={slide.displayTitle}>{slide.displayTitle}</span>
                  <StatusIndicator results={checkResults?.[slide.id]} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

interface LessonViewerProps {
  slide: LessonSlide | null;
  viewMode: 'preview' | 'markdown';
  setViewMode: (mode: 'preview' | 'markdown') => void;
  slideMarkdown: string;
  onSlideMarkdownChange: (markdown: string) => void;
  onCheckSlide: () => void;
  onOpenAIEdit: () => void;
  isChecking: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const LessonViewer: React.FC<LessonViewerProps> = ({ slide, viewMode, setViewMode, slideMarkdown, onSlideMarkdownChange, onCheckSlide, onOpenAIEdit, isChecking, onUndo, onRedo, canUndo, canRedo }) => {
  return (
    <div className="flex-1 flex flex-col bg-gray-800">
      <header className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700 shadow-md z-10">
        <h2 className="text-2xl font-bold text-white truncate pr-4">
          {slide ? slide.displayTitle : viewMode === 'preview' ? 'Vorschau' : 'Markdown Editor'}
        </h2>
        <div className="flex items-center space-x-4 flex-shrink-0">
          <button
            onClick={onOpenAIEdit}
            disabled={!slide}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            AI-Edit
          </button>
          <button
            onClick={onCheckSlide}
            disabled={isChecking || !slide}
            className="flex items-center justify-center px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {isChecking ? (
              <>
                <Spinner />
                Prüfung läuft...
              </>
            ) : (
              'Folie prüfen'
            )}
          </button>
          <span className="text-gray-400">Markdown</span>
          <ToggleSwitch
            id="lesson-view-toggle"
            checked={viewMode === 'preview'}
            onChange={(checked) => setViewMode(checked ? 'preview' : 'markdown')}
          />
          <span className="text-gray-400">Vorschau</span>
        </div>
      </header>
      <div className="flex-1 overflow-auto">
        {viewMode === 'preview' ? (
          <div className="p-6">
            {slide ? (
              <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-xl p-6">
                <MarkdownRenderer text={slide.markdown} className="prose prose-invert max-w-none" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-gray-500">
                <div>
                  <h3 className="text-2xl font-semibold">Keine Folie ausgewählt.</h3>
                  <p>Wählen Sie eine Folie aus der Seitenleiste aus, um sie hier anzuzeigen.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <MarkdownView
            value={slideMarkdown}
            onChange={onSlideMarkdownChange}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        )}
      </div>
    </div>
  );
};

export const LessonEditor: React.FC = () => {
  const {
    state: rawMarkdown,
    setState: setRawMarkdown,
    resetState: resetRawMarkdown,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableState<string>(() => localStorage.getItem('lessonMarkdown') || INITIAL_MARKDOWN);

  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview');
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkResults, setCheckResults] = useState<Record<string, CheckResults | null> | null>(null);
  const [isResultsPanelOpen, setIsResultsPanelOpen] = useState<boolean>(false);
  const [isAIEditOpen, setIsAIEditOpen] = useState<boolean>(false);

  const { prompts } = usePrompts();
  const { model } = useModel();
  const { debug } = useDebug();

  const lesson = useMemo(() => parseMarkdownToLesson(rawMarkdown), [rawMarkdown]);
  const slides = lesson.slides;

  useEffect(() => {
    localStorage.setItem('lessonMarkdown', rawMarkdown);
  }, [rawMarkdown]);

  useEffect(() => {
    if (!selectedSlideId && slides.length > 0) {
      setSelectedSlideId(slides[0].id);
    }
    if (selectedSlideId && !slides.find(s => s.id === selectedSlideId)) {
      setSelectedSlideId(slides.length ? slides[0].id : null);
    }
  }, [slides, selectedSlideId]);

  const selectedSlide = useMemo(() => slides.find(s => s.id === selectedSlideId) || null, [slides, selectedSlideId]);

  const slideMarkdown = selectedSlide ? selectedSlide.markdown : '';

  const handleSlideMarkdownChange = useCallback((newMarkdownForSlide: string) => {
    if (!selectedSlide) return;
    setRawMarkdown(prev => {
      const range = findRange(prev, selectedSlide.markdown);
      if (!range) {
        console.warn('Konnte Folien-Markdown nicht lokalisieren, überspringe Update.');
        return prev;
      }
      return replaceRange(prev, range, newMarkdownForSlide);
    });
  }, [selectedSlide, setRawMarkdown]);

  const handleSlideSelect = useCallback((slideId: string) => {
    setSelectedSlideId(slideId);
    setViewMode('preview');
    const hasResults = checkResults && checkResults[slideId];
    setIsResultsPanelOpen(!!hasResults);
  }, [checkResults]);

  const handleCheckSlide = useCallback(async () => {
    if (!selectedSlide || !selectedSlideId) return;
    setIsChecking(true);
    setCheckResults(prev => ({ ...(prev || {}), [selectedSlideId]: null }));
    setIsResultsPanelOpen(true);
    try {
      const results = await runChecks(selectedSlide.markdown, prompts, model, debug);
      setCheckResults(prev => ({ ...(prev || {}), [selectedSlideId]: results }));
    } catch (error) {
      console.error('Error checking slide:', error);
      alert('Fehler bei der Überprüfung der Folie. Bitte erneut versuchen.');
    } finally {
      setIsChecking(false);
    }
  }, [selectedSlide, selectedSlideId, prompts, model, debug]);

  const handleCheckAllSlides = useCallback(async () => {
    if (!slides.length) return;
    setIsChecking(true);
    setIsResultsPanelOpen(false);
    setCheckResults({});

    const allResults: Record<string, CheckResults> = {};

    for (const slide of slides) {
      try {
        const result = await runChecks(slide.markdown, prompts, model, debug);
        allResults[slide.id] = result;
        setCheckResults(prev => ({ ...(prev || {}), [slide.id]: result }));
      } catch (error) {
        console.error(`Fehler bei der Folienprüfung (${slide.displayTitle}):`, error);
        alert(`Fehler bei der Überprüfung von ${slide.displayTitle}.`);
      }
    }

    setIsChecking(false);

    const firstSlideWithIssues = slides.find(slide => {
      const res = allResults[slide.id];
      return res && (res.fachlich.length > 0 || res.sprachlich.length > 0 || res.guidelines.length > 0);
    });

    if (firstSlideWithIssues) {
      setSelectedSlideId(firstSlideWithIssues.id);
      setIsResultsPanelOpen(true);
    } else {
      alert('Keine Fehler in allen Folien gefunden!');
    }
  }, [slides, prompts, model, debug]);

  const handleApplyFix = useCallback((errorToFix: ActionableError) => {
    if (!selectedSlide) return;

    const range = findRange(selectedSlide.markdown, errorToFix.original);
    if (!range) {
      alert('Originaltext konnte im Folien-Markdown nicht eindeutig gefunden werden. Bitte manuell übernehmen.');
      return;
    }

    const updatedMarkdown = replaceRange(selectedSlide.markdown, range, errorToFix.suggestion);
    handleSlideMarkdownChange(updatedMarkdown);

    setCheckResults(prev => {
      if (!prev || !selectedSlideId || !prev[selectedSlideId]) return prev;
      const current = prev[selectedSlideId]!;
      const isSameError = (e: ActionableError) =>
        e.original === errorToFix.original &&
        e.suggestion === errorToFix.suggestion &&
        e.explanation === errorToFix.explanation;

      return {
        ...prev,
        [selectedSlideId]: {
          fachlich: current.fachlich.filter(e => !isSameError(e)),
          sprachlich: current.sprachlich.filter(e => !isSameError(e)),
          guidelines: current.guidelines.filter(e => !isSameError(e)),
        },
      };
    });
  }, [selectedSlide, selectedSlideId, handleSlideMarkdownChange]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        alert('Die Zwischenablage ist leer.');
        return;
      }
      resetRawMarkdown(text);
      setSelectedSlideId(null);
      setCheckResults(null);
      setIsResultsPanelOpen(false);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      alert('Fehler beim Lesen aus der Zwischenablage.');
    }
  }, [resetRawMarkdown]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawMarkdown);
      alert('Markdown wurde in die Zwischenablage kopiert!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Fehler beim Kopieren in die Zwischenablage.');
    }
  }, [rawMarkdown]);

  return (
    <div className="flex h-full">
      <LessonSidebar
        lessonTitle={lesson.title}
        slides={slides}
        onSlideSelect={handleSlideSelect}
        selectedSlideId={selectedSlideId}
        onCheckAllSlides={handleCheckAllSlides}
        isChecking={isChecking}
        checkResults={checkResults}
        onPasteFromClipboard={handlePasteFromClipboard}
        onCopyToClipboard={handleCopyToClipboard}
      />
      <main className="flex-1 flex flex-row overflow-hidden">
        <LessonViewer
          slide={selectedSlide}
          viewMode={viewMode}
          setViewMode={setViewMode}
          slideMarkdown={slideMarkdown}
          onSlideMarkdownChange={handleSlideMarkdownChange}
          onCheckSlide={handleCheckSlide}
          onOpenAIEdit={() => setIsAIEditOpen(true)}
          isChecking={isChecking && !!(checkResults && selectedSlideId && checkResults[selectedSlideId] === null)}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <CheckResultsPanel
          isOpen={isResultsPanelOpen}
          onClose={() => setIsResultsPanelOpen(false)}
          results={selectedSlideId ? checkResults?.[selectedSlideId] ?? null : null}
          onApplyFix={handleApplyFix}
        />
        <AIChatPanel
          isOpen={isAIEditOpen}
          docked
          supportsPrompts
          onClose={() => setIsAIEditOpen(false)}
          contextLabel={selectedSlide ? selectedSlide.displayTitle : 'Folie'}
          contextMarkdown={selectedSlide ? selectedSlide.markdown : ''}
          onReplace={handleSlideMarkdownChange}
        />
      </main>
    </div>
  );
};
