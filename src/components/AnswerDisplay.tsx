import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LoadingSpinner } from './common/LoadingSpinner';

interface AnswerDisplayProps {
  answer: string;
  isLoading: boolean;
}

export default function AnswerDisplay({ answer, isLoading }: AnswerDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Suggested Answer</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[20rem] prose prose-sm dark:prose-invert max-w-none">
        {isLoading && !answer ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : (
          <p>
            {answer ||
              'Your generated answer will appear here after you record a question.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
