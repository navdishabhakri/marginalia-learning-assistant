export interface ProgressUpdate{
    step:string,
    message:string,
}

const progressStore: Record<string,ProgressUpdate> = {}

export const setProgress = (id:string, step:string, message:string)=>{
    progressStore[id]={step,message}
}
export const getProgress = (id:string)=>{
    return progressStore[id]
}

