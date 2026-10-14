import { useState, useEffect, useCallback } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { VariablesDrawer } from './components/VariablesDrawer';
import { QuickStartGuide } from './components/QuickStartGuide';
import { InkTool, PaperStyle, Stroke } from './canvas/types';
import { SamplePreset } from './canvas/sampleEquations';

export function App() {
  const [tool, setTool] = useState<InkTool>('pen');
  const [color, setColor] = useState<string>('#18181b');
  const [width, setWidth] = useState<number>(3.5);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('ruled');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Variable memory state
  const [variables, setVariables] = useState<Record<string, number>>({});
  const [isVariablesOpen, setIsVariablesOpen] = useState<boolean>(false);

  // Undo / Redo triggers
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [clearCount, setClearCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Sample trigger
  const [sampleTrigger, setSampleTrigger] = useState<{
    id: number;
    text: string;
    strokes: Stroke[];
  } | undefined>(undefined);

  // Uploaded image trigger
  const [uploadedImageTrigger, setUploadedImageTrigger] = useState<{
    id: number;
    dataUrl: string;
  } | undefined>(undefined);


  const handleUndo = useCallback(() => {
    setUndoCount((c) => c + 1);
  }, []);

  const handleRedo = useCallback(() => {
    setRedoCount((c) => c + 1);
  }, []);

  const handleClear = useCallback(() => {
    setClearCount((c) => c + 1);
  }, []);

  const handleInsertSample = (preset: SamplePreset) => {
    // Generate sample strokes placed nicely in center-top of viewport
    const startX = Math.max(80, window.innerWidth * 0.15);
    const startY = Math.max(120, window.innerHeight * 0.22);
    const newStrokes = preset.generateStrokes(startX, startY);

    setSampleTrigger({
      id: Date.now(),
      text: preset.name,
      strokes: newStrokes,
    });
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting input if user is typing in any text input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'p') {
        setTool('pen');
      } else if (e.key.toLowerCase() === 'h') {
        setTool('highlighter');
      } else if (e.key.toLowerCase() === 'e') {
        setTool('eraser_stroke');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-stone-100 dark:bg-zinc-950">
      {/* Utility Toolbar */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        width={width}
        setWidth={setWidth}
        paperStyle={paperStyle}
        setPaperStyle={setPaperStyle}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={canUndo}
        canRedo={canRedo}
        variablesCount={Object.keys(variables).length}
        onOpenVariables={() => setIsVariablesOpen(true)}
        onInsertSample={handleInsertSample}
        onUploadImage={(dataUrl) => setUploadedImageTrigger({ id: Date.now(), dataUrl })}
      />

      {/* Main Digital Ink Canvas */}
      <main className="w-full h-full relative">
        <Canvas
          tool={tool}
          color={color}
          width={width}
          paperStyle={paperStyle}
          soundEnabled={soundEnabled}
          onVariablesChange={setVariables}
          undoTrigger={undoCount}
          redoTrigger={redoCount}
          clearTrigger={clearCount}
          sampleEquationTrigger={sampleTrigger}
          uploadedImageTrigger={uploadedImageTrigger}
          onUndoRedoStateChange={(u, r) => {
            setCanUndo(u);
            setCanRedo(r);
          }}
        />
      </main>

      {/* Slide-out Variable Memory Inspector */}
      <VariablesDrawer
        isOpen={isVariablesOpen}
        onClose={() => setIsVariablesOpen(false)}
        variables={variables}
        onClearVariables={() => setVariables({})}
      />

      {/* First-time Tips & Gesture Help Guide */}
      <QuickStartGuide />
    </div>
  );
}

export default App;
