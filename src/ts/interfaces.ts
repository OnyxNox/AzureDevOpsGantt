export interface IMermaidJsDiagram {
    raw: string,
    svg: HTMLElement,
}

export interface IMermaidJsRenderOptions {
    flowchart: { useMaxWidth: boolean },
    gantt: {
        barGap: number,
        barHeight: number,
        fontSize: number,
        leftPadding: number,
        rightPadding: number,
        sectionFontSize: number,
        useWidth: number,
    },
    securityLevel: string,
    startOnLoad: boolean,
    theme: string,
}