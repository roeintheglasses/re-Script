"use client";
import { javascript } from "@codemirror/lang-javascript";
import { dracula } from "@uiw/codemirror-theme-dracula";
import CodeMirror from "@uiw/react-codemirror";
import { type FC, useEffect, useState } from "react";

interface Props {
  code: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}

export const CodeBlock: FC<Props> = ({
  code,
  editable = false,
  onChange = () => {
    return;
  },
}) => {
  const [copyText, setCopyText] = useState<string>("Copy");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCopyText("Copy");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [copyText]);

  return (
    <div className="relative">
      <button
        className="absolute right-0 top-0 z-10 rounded bg-[#1A1B26] p-1 text-xs text-white hover:bg-[#2D2E3A] active:bg-[#2D2E3A]"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopyText("Copied!");
        }}
      >
        {copyText}
      </button>

      <CodeMirror
        editable={editable}
        value={code}
        minHeight="600px"
        maxHeight="1200px"
        extensions={[javascript()]}
        theme={dracula}
        onChange={(value) => onChange(value)}
        className="rounded-md border-2 border-gray-500"
      />
    </div>
  );
};
