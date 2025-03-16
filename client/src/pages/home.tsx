import { useState, useEffect as ReactuseEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ClipboardCopy, Bot, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function Home() {
  const [text, setText] = useState("");
  const [summarized, setSummarized] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const { mutate: summarize, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/summarize", { text });
      return res.json();
    },
    onSuccess: (data) => {
      setText(data.summary);
      setSummarized(true);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
        duration: 5000,
      });
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Text has been copied to clipboard",
        duration: 5000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy text to clipboard",
        duration: 5000,
      });
    }
  };

  const handleSubmit = () => {
    setSummarized(false);
    setProgress(0);
    summarize();
  };

  const handleClear = () => {
    setText("");
    setSummarized(false);
  };

  // Animate progress bar when loading
  ReactuseEffect(() => {
    if (isPending) {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);
      return () => clearInterval(timer);
    } else {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 400);
      return () => clearTimeout(timer);
    }
  }, [isPending]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6">
          {isPending && (
            <div className="absolute top-0 left-0 w-full">
              <Progress value={progress} className="h-1 rounded-none" />
            </div>
          )}
          <div className="mb-6 flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Text Summarizer</h1>
          </div>

          <div className="relative">
            <motion.div
              animate={{
                opacity: isPending ? 0.5 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              <Textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSummarized(false);
                }}
                placeholder="Enter or paste your text here..."
                className="min-h-[300px] mb-4 resize-none pr-10"
                disabled={isPending}
              />
            </motion.div>
            {text && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex justify-end">
            {isPending ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Summarizing...
              </Button>
            ) : summarized ? (
              <Button variant="outline" onClick={handleCopy}>
                <ClipboardCopy className="mr-2 h-4 w-4" />
                Copy to clipboard
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!text.trim()}
              >
                Summarize
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}