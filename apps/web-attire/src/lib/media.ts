/** True for direct video files (.mp4 / .webm / .ogg); YouTube and Vimeo links are not files. */
export const isFileVideo = (u?: string | null) => !!u && /\.(mp4|webm|ogg)(\?|$)/i.test(u);
