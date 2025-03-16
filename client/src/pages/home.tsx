import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ClipboardCopy, Bot } from "lucide-react";

export default function Home() {
  const [text, setText] = useState("");
  const { toast } = useToast();

  const { mutate: summarize, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/summarize", { text });
      return res.json();
    },
    onSuccess: (data) => {
      setText(data.summary);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Text has been copied to clipboard",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy text to clipboard",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Text Summarizer</h1>
          </div>
          
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter or paste your text here..."
            className="min-h-[300px] mb-4 resize-none"
          />

          <div className="flex justify-end">
            {isPending ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Summarizing...
              </Button>
            ) : text ? (
              <Button variant="outline" onClick={handleCopy}>
                <ClipboardCopy className="mr-2 h-4 w-4" />
                Copy to clipboard
              </Button>
            ) : (
              <Button onClick={() => summarize()}>Summarize</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
