"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const [isClient, setIsClient] = useState(false)
  const { toasts } = useToast()

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return (
      <ToastProvider>
        {toasts.map(({ id, title, description, action, ...props }) => (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                    <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </Toast>
        ))}
        <ToastViewport className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[100]" />
      </ToastProvider>
  )
}
