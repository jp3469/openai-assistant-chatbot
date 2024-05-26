'use server'
import { nanoid } from "@/lib/utils"
import { Message } from "ai/react/dist"
import { auth } from '@/auth'
import { kv } from '@vercel/kv'

export default async function saveChat(id: string | undefined, messages: Message[]) {
    const userId = (await auth())?.user.id

    const title = messages[0].content.substring(0, 100)
    const chatId = id ?? nanoid()
    const createdAt = Date.now()
    const path = `/chat/${chatId}`
    const payload = {
      id,
      title,
      userId,
      createdAt,
      path,
      messages: messages
    }
    await kv.hmset(`chat:${id}`, payload)
    await kv.zadd(`user:chat:${userId}`, {
      score: createdAt,
      member: `chat:${id}`
    })
  }