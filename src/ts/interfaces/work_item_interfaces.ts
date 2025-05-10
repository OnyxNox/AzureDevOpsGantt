export interface IWorkItem {
    fields: any,

    id: number,

    relations: IWorkItemRelation[],
}

export interface IWorkItemRelation {
    attributes: IWorkItemRelationAttribute,

    url: string,
}

export interface IWorkItemRelationAttribute {
    name: string,
}

export interface IWorkItemTypeState {
    color: string,

    name: string,
}

export interface IWorkItemUpdate {

}