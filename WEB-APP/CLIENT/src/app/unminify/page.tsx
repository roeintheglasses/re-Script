"use client";

import { useState } from "react";
import { Button } from "@nextui-org/button";
import { MagnifyingGlass } from "react-loader-spinner";
import { Select, SelectSection, SelectItem } from "@nextui-org/select";
import { Input } from "@nextui-org/input";

import { CodeBlock } from "@/components/CodeBlock";

const LLMs = [
  {
    value: "openAI",
    label: "GPT-4",
  },
  {
    value: "claude",
    label: "Claude-3",
  },
];

export default function HomePage() {
  const [inputCode, setInputCode] = useState("test data");
  const [loading, setLoading] = useState(false);
  const [outputCode, setOutputCode] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [model, setModel] = useState("");

  const handleTranslate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/unminify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          code: inputCode,
          apiKey,
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const code: { data: string } = await res.json();
      setOutputCode(code.data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[80vh] ">
      <div className="flex flex-col items-center justify-center gap-8 py-8 md:gap-16 md:pb-16 xl:pb-24">
        <div className="mt-10 flex max-w-4xl flex-col items-center justify-between gap-5 sm:flex-row">
          <Select
            placeholder="Select Model"
            className="w-[250px] max-w-xl sm:w-auto"
            size="lg"
            variant="flat"
          >
            {LLMs.map((llm) => (
              <SelectItem key={llm.value} value={llm.value}>
                {llm.label}
              </SelectItem>
            ))}
          </Select>

          <Input
            type="text"
            variant="flat"
            className="w-[250px] max-w-xl sm:w-auto"
            placeholder="Enter your api key"
            onValueChange={setApiKey}
            size="lg"
            width={"300px"}
          />

          <div>
            <Button
              variant="flat"
              className="w-[250px] max-w-xl sm:w-auto"
              onClick={handleTranslate}
              isLoading={loading}
              size="lg"
            >
              {loading ? "processing" : "Submit"}
            </Button>
          </div>
        </div>

        <MagnifyingGlass
          visible={loading}
          height="80"
          width="80"
          ariaLabel="magnifying-glass-loading"
          wrapperStyle={{}}
          wrapperClass="magnifying-glass-wrapper"
          glassColor="#c0efff"
          color="#e15b64"
        />

        <div className="mt-6 flex w-full max-w-[1200px] flex-col items-center justify-between gap-x-2 sm:flex-row sm:items-start sm:gap-x-10">
          <div className="flex h-full w-10/12 flex-col justify-center space-y-2 sm:w-2/4">
            <div className="text-center text-xl font-bold">Input</div>

            <CodeBlock
              code={inputCode}
              editable={!loading}
              onChange={(value) => {
                setInputCode(value);
              }}
            />
          </div>
          <div className="mt-8 flex h-full w-10/12 flex-col justify-center space-y-2 sm:mt-0 sm:w-2/4">
            <div className="text-center text-xl font-bold">Output</div>

            <CodeBlock code={outputCode} />
          </div>
        </div>
      </div>
    </main>
  );
}
