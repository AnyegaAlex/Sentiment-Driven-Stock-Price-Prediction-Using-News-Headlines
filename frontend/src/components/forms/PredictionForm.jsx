import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import api from '@/services/api'

export const PredictionForm = ({ onPredict }) => {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!input.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter news content to analyze",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post('/predictions/', { news_text: input })
      onPredict(response.data)
      toast({
        title: "Prediction Generated",
        description: `Model predicts: ${response.data.prediction} (${(response.data.confidence * 100).toFixed(1)}% confidence)`
      })
    } catch (error) {
      toast({
        title: "Prediction Failed",
        description: error.response?.data?.detail || "Service unavailable",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste financial news article..."
        className="min-h-[150px]"
      />
      <div className="flex items-center gap-4">
        <Progress 
          value={Math.min(input.length, 10000)}
          max={10000}
          className="h-2"
        />
        <span className="text-sm text-muted-foreground">
          {input.length}/10,000 characters
        </span>
      </div>
      <Button 
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Analyzing..." : "Generate Prediction"}
      </Button>
    </div>
  )
}