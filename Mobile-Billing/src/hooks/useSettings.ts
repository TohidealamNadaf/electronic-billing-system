import { useCallback, useEffect, useState } from "react"
import { useDatabase } from "@/DatabaseContext"
import { generateUUID } from "@/lib/utils"

export interface AppSettings {
    companyName?: string
    companyOwner?: string
    companyAddress?: string
    companyPhone?: string
    companyEmail?: string
    termAndConditions?: string
    isGstEnabled?: boolean | string
    gstRate?: string
    gstNumber?: string
    businessProfileConfig?: string // JSON
    isDiscountEnabled?: boolean | string
    showTerms?: boolean | string
    customColumns?: string // JSON
    columnLabels?: string // JSON
}

type SettingsState = Partial<AppSettings>

export function useSettings() {
    const { db, save } = useDatabase()
    const [settings, setSettings] = useState<SettingsState>({})
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<Error | null>(null)

    const loadSettings = useCallback(async () => {
        if (!db) return
        try {
            setLoading(true)
            setError(null)

            const res = await db.query("SELECT * FROM settings")
            const map: SettingsState = {}

            if (res.values) {
                res.values.forEach((row: any) => {
                    if (row.key) {
                        map[row.key as keyof AppSettings] = row.value
                    }
                })
            }

            setSettings(map)
        } catch (e) {
            setError(e as Error)
            console.error("Failed to load settings", e)
        } finally {
            setLoading(false)
        }
    }, [db])

    const updateSettings = useCallback(
        async (updates: SettingsState) => {
            if (!db) return
            try {
                setLoading(true)
                setError(null)

                const entries = Object.entries(updates)
                for (const [key, value] of entries) {
                    if (value === undefined || value === null) continue

                    const existing = await db.query(
                        "SELECT id FROM settings WHERE key = ?",
                        [key]
                    )

                    if (existing && existing.values && existing.values.length > 0) {
                        const id = existing.values[0].id
                        await db.run(
                            "UPDATE settings SET value = ? WHERE id = ?",
                            [value, id]
                        )
                    } else {
                        await db.run(
                            "INSERT INTO settings (id, key, value) VALUES (?, ?, ?)",
                            [generateUUID(), key, value]
                        )
                    }
                }

                await save()
                await loadSettings()
            } catch (e) {
                setError(e as Error)
                console.error("Failed to update settings", e)
            } finally {
                setLoading(false)
            }
        },
        [db, loadSettings, save]
    )

    useEffect(() => {
        if (db) {
            loadSettings()
        }
    }, [db, loadSettings])

    return {
        settings,
        loading,
        error,
        reload: loadSettings,
        updateSettings,
    }
}

