import React, { createContext, useContext, useEffect, useState } from 'react';
import { DatabaseService } from '@/lib/database';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';

interface DatabaseContextType {
    db: SQLiteDBConnection | null;
    isInitialized: boolean;
    loadingState: string;
    error: Error | null;
    save: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType>({
    db: null,
    isInitialized: false,
    loadingState: "",
    error: null,
    save: async () => { }, // Default duplicate implementation
});

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [db, setDb] = useState<SQLiteDBConnection | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loadingState, setLoadingState] = useState<string>("Initializing...");
    const [error, setError] = useState<Error | null>(null);
    const initRef = React.useRef(false);

    const save = async () => {
        try {
            await DatabaseService.getInstance().save();
        } catch (e) {
            console.error("Failed to save to store", e);
        }
    };

    useEffect(() => {
        const initDB = async () => {
            if (initRef.current) return;
            initRef.current = true;

            try {
                const dbService = DatabaseService.getInstance();

                setLoadingState("Initializing Plugin...");
                await dbService.initializePlugin();

                setLoadingState("Opening Connection...");
                await dbService.openConnection();

                setDb(dbService.getDB());
                setIsInitialized(true);
                setLoadingState("Ready");
            } catch (err: any) {
                console.error("Failed to initialize database", err);
                setError(err);
                setLoadingState("Error");
                initRef.current = false; // Allow retry if failed
            }
        };

        if (!isInitialized) {
            initDB();
        }
    }, []);

    return (
        <DatabaseContext.Provider value={{ db, isInitialized, error, loadingState, save }}>
            {children}
        </DatabaseContext.Provider>
    );
};
