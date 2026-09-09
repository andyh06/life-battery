import { Card, CardContent } from "@/components/ui/card";

/**
 * Verbatim disclaimer text — do not paraphrase or reword when editing this
 * component.
 */
export function DisclaimerPanel() {
  return (
    <Card className="w-full bg-muted/30">
      <CardContent className="text-sm text-muted-foreground">
        This is a statistical estimate, not a prophecy. The model treats you as an average member
        of your demographic and lifestyle category. It cannot account for your genetics,
        accidents, undiagnosed conditions, future medical advances, or simple luck. If this result
        is upsetting, please speak to a doctor or someone you trust. Every modifiable variable
        above is, by definition, changeable.
      </CardContent>
    </Card>
  );
}
