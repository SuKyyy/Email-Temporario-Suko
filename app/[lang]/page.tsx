import type { Metadata } from "next"
import { getDictionary, isValidLocale, defaultLocale, locales } from "@/lib/i18n"
import { EmailPage } from "@/components/email-page"

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const locale = isValidLocale(lang) ? lang : defaultLocale
  const dict = await getDictionary(locale)
  return {
    title: dict.metadata.title,
    description: dict.metadata.description,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const locale = isValidLocale(lang) ? lang : defaultLocale
  const dict = await getDictionary(locale)
  return <EmailPage dict={dict} lang={locale} />
}
