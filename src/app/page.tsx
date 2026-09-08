import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Life Battery</CardTitle>
          <CardDescription>
            Estimate how much life you&apos;ve got left in the tank.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="w-full">
            Coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
