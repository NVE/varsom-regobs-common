import { AppMode } from './app-mode.enum';
import { LangKey } from './lang-key.enum';

export interface AppConfig {
    appMode: AppMode;
    language: LangKey;
}
