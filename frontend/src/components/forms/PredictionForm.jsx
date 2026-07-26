import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
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
        description: `LSTM model predicts: ${response.data.prediction} (${(response.data.confidence * 100).toFixed(1)}% confidence)`
      })
    } catch (error) {
      toast({
        title: "Prediction Failed",
        description: error.response?.data?.detail || "Service unavailable. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const charCount = input.length
  const maxChars = 10000
  const percent = Math.min((charCount / maxChars) * 100, 100)
  const isNearLimit = charCount > maxChars * 0.9

  return (
    <div className="space-y-4">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste financial news article..."
        className="min-h-[150px] bg-gray-900 border-gray-800 text-white placeholder:text-gray-500 focus:ring-gray-500 focus:ring-offset-black"
        disabled={isLoading}
        aria-label="News article text for LSTM prediction"
      />
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isNearLimit ? 'bg-red-400' : 'bg-green-400'
            )}
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={charCount}
            aria-valuemin={0}
            aria-valuemax={maxChars}
          />
        </div>
        <span className={cn(
          'text-sm',
          isNearLimit ? 'text-red-400' : 'text-gray-400'
        )}>
          {charCount.toLocaleString()}/{maxChars.toLocaleString()} characters
        </span>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !input.trim()}
        className="min-h-[44px] bg-white text-black hover:bg-gray-200 focus-visible:ring-gray-500 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Analyzing..." : "Generate Prediction"}
      </Button>
    </div>
  )
}