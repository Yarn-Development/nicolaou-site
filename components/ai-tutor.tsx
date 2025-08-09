"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Send, Sparkles, ThumbsUp, ThumbsDown, Copy, ImageIcon } from "lucide-react"

export function AITutor() {
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI tutor. I can help explain concepts, solve problems, or answer questions about any subject. What would you like to learn today?",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const chatContainerRef = useRef(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  const handleSendMessage = () => {
    if (!message.trim()) return

    // Add user message to chat
    setChatHistory([...chatHistory, { role: "user", content: message }])
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "The concept you're asking about relates to the law of conservation of energy. This fundamental principle states that energy cannot be created or destroyed, only transformed from one form to another. For example, when a ball falls, its potential energy converts to kinetic energy.",
        "To solve this type of problem, we need to use the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a. Let's substitute the values and work through it step by step.",
        "That's an interesting question! In literature, symbolism is when authors use objects, characters, or colors to represent abstract ideas or concepts. For instance, a dove often symbolizes peace.",
        "Let me explain this historical event in context. It happened during a period of significant social change, and was influenced by several economic and political factors that were converging at that time.",
      ]

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: responses[Math.floor(Math.random() * responses.length)],
        },
      ])
      setIsLoading(false)
    }, 1500)

    setMessage("")
  }

  return (
    <div className="flex flex-col h-[500px]">
      <Tabs defaultValue="chat" className="flex flex-col h-full">
        <TabsList className="self-center glassmorphic mb-4">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Visual Learning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col space-y-4">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "glassmorphic border border-muted/30"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">AI Tutor</span>
                    </div>
                  )}
                  <p className="text-sm">{msg.content}</p>

                  {msg.role === "assistant" && (
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-muted/30">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-3 glassmorphic border border-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI Tutor</span>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse"></div>
                    <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse delay-150"></div>
                    <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse delay-300"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Textarea
              placeholder="Ask a question about any subject..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              className="flex-1 min-h-[80px] max-h-[160px] glassmorphic border-muted/30"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="h-[80px] w-[80px] bg-primary hover:bg-primary/90"
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="image" className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Sparkles className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-bold">Visual Learning</h3>
              <p className="text-muted-foreground max-w-md">
                Upload an image or diagram to get AI-powered explanations and annotations. Perfect for understanding
                complex visual concepts.
              </p>
              <Button className="bg-primary hover:bg-primary/90 mt-4">Upload Image</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
