import * as React from "react"
import { motion, HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm hover-lift",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" as const }}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      data-slot="card-title"
      className={cn("leading-none font-semibold text-gradient", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      data-slot="card-content"
      className={cn("px-6", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
