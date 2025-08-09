"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send } from "lucide-react"

export function AIAssistant() {
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI teaching assistant. How can I help you today?",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = () => {
    if (!message.trim()) return

    // Add user message to chat
    setChatHistory([...chatHistory, { role: "user", content: message }])
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I can help you create a worksheet for that topic. Would you like me to generate some questions?",
        "Based on recent performance data, your students might benefit from more practice with this concept.",
        "I've analyzed similar lesson plans and can suggest some improvements to increase engagement.",
        "Here's a quick assessment you could use to gauge understanding of this material.",
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
    <div className="flex flex-col h-[300px]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "glassmorphic border border-muted/30"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-primary">AI Assistant</span>
                </div>
              )}
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-3 py-2 glassmorphic border border-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">AI Assistant</span>
              </div>
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse"></div>
                <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse delay-150"></div>
                <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse delay-300"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Ask for help with lesson plans, grading, or content..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
          className="flex-1 glassmorphic border-muted/30"
        />
        <Button
          size="icon"
          onClick={handleSendMessage}
          disabled={!message.trim() || isLoading}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </div>
  )
}
