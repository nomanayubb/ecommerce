import type { Branding, CategoryNode, Store } from "./api";
import type { Pack } from "@/themes/types";

export interface Section { id: string; type: string; enabled: boolean; settings: Record<string, any>; blocks: { id: string; type: string; settings: Record<string, any> }[] }
export interface PageData { key: string; title: string; seo: { title?: string; description?: string }; sections: Section[] }
export interface SectionCtx { branding: Branding; pack: Pack; store: Store; categories: CategoryNode[] }
