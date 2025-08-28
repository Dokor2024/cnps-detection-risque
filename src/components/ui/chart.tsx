import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Chart context for configuration
const ChartContext = React.createContext<{
  config: Record<string, any>
}>({
  config: {},
})

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: {
  id?: string
  className?: string
  children: React.ReactNode
  config: Record<string, any>
} & React.ComponentProps<"div">) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn("flex aspect-video justify-center text-xs", className)}
        {...props}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: Object.entries(config)
              .map(
                ([key, value]) =>
                  `[data-chart="${chartId}"] .recharts-${key} { fill: ${
                    value?.color || "#000"
                  }; }`
              )
              .join(""),
          }}
        />
        {children}
      </div>
    </ChartContext.Provider>
  )
}

export const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean
    payload?: Array<{
      color?: string
      dataKey?: string
      value?: any
      payload?: any
    }>
    label?: string
  }
>(({ active, payload, label, className, ...props }, ref) => {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
      {...props}
    >
      <div className="text-muted-foreground">{label}</div>
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium">
            {item.dataKey}: {item.value}
          </span>
        </div>
      ))}
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

export const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    payload?: Array<{
      value?: string
      color?: string
    }>
  }
>(({ className, payload, ...props }, ref) => {
  if (!payload?.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-4", className)}
      {...props}
    >
      {payload.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

export {
  ChartTooltipContent,
  ChartLegendContent,
}

// Export commonly used chart components
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"