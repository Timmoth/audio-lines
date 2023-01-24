import * as THREE from "three";
import { useRef, useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React from "react";
import { suspend } from "suspend-react";
import { unmountComponentAtNode } from "react-dom";
import fragmentShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";
import "./App.css";

export function Start() {
  createRoot(document.getElementById("root") as HTMLElement).render(
    <Overlay />
  );
}

export function Stop() {
  unmountComponentAtNode(document.getElementById("root") as HTMLElement);
}

function Overlay() {
  const [ready, setReady] = useState(false);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer>();

  const handlePlayClick = () => {
    setReady(true);
  };

  const addFile = async (e) => {
    if (e.target.files[0]) {
      setArrayBuffer(await e.target.files[0].arrayBuffer());
      setReady(true);
    }
  };

  return (
    <div className="app-container">
      {ready && <App arrayBuffer={arrayBuffer} />}
      {!ready && (
        <div className="container">
          <div className="file-input">
            <input type="file" onChange={addFile} id="file" className="file" />
            <label htmlFor="file" className="file-input-label">
              Select file
            </label>
          </div>
          <label className="label">Or</label>
          <button className="playButton" onClick={handlePlayClick}>
            Play
          </button>
        </div>
      )}
    </div>
  );
}

function App({ arrayBuffer }: { arrayBuffer: ArrayBuffer | undefined }) {
  return (
    <Canvas>
      <ambientLight />
      <ShaderPlane arrayBuffer={arrayBuffer} />
    </Canvas>
  );
}

const fftSize = 256;
async function createAudio(arrayBuffer: ArrayBuffer | undefined) {
  if (!arrayBuffer) {
    const res = await fetch(
      "https://timmoth.github.io/audio-lines/dist/tetris.mp3"
    );
    arrayBuffer = await res.arrayBuffer();
  }
  const context = new window.AudioContext();
  const source = context.createBufferSource();
  source.buffer = await new Promise((res) =>
    context.decodeAudioData(arrayBuffer!, res)
  );
  source.loop = true;
  source.start(0);
  const gain = context.createGain();
  const analyser = context.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0.8;
  source.connect(analyser);
  analyser.connect(gain);
  const data = new Uint8Array(analyser.frequencyBinCount);
  return {
    context,
    source,
    gain,
    data,
    update: () => {
      analyser.getByteFrequencyData(data);
      return data.reduce((prev, cur) => prev + cur / data.length, 0);
    },
  };
}

function ShaderPlane({
  arrayBuffer,
}: {
  arrayBuffer: ArrayBuffer | undefined;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);

  const { gain, context, update, data } = suspend(
    () => createAudio(arrayBuffer),
    []
  );

  const uniforms = useMemo(
    () => ({
      u_size: {
        value: new THREE.Vector2(size.width, size.height),
      },
      u_FrequencyData: {
        value: new Array<THREE.Vector4>(fftSize / 2 / 4),
      },
    }),
    []
  );

  useThree((state) => {
    uniforms.u_size.value.set(state.size.width, state.size.height);

    if (mesh.current != undefined) {
      mesh.current.scale.x = state.viewport.width;
      mesh.current.scale.y = state.viewport.height;
    }
  });

  useFrame(() => {
    update();
    uniforms.u_FrequencyData.value = getFrequencyData(data);
  });

  useEffect(() => {
    gain.connect(context.destination);
    return () => gain.disconnect();
  }, [gain, context]);

  return (
    <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function getFrequencyData(data: Uint8Array): THREE.Vector4[] {
  let arr: THREE.Vector4[] = [];
  for (let i = 0; i < data.length; i += 4) {
    arr.push(new THREE.Vector4(data[i], data[i + 1], data[i + 2], data[i + 3]));
  }
  return arr;
}
