export type StatisticsRow = { day:string; type:'shop'|'supplier'|'article'; id:string; metric:'view'|'click'|'whatsapp'; source:string; count:number; name:string; platform:string };
export type StatisticsItem = { id:string; type:string; name:string; platform:string; views:number; clicks:number; whatsapp:number };
export type StatisticsCatalogItem = Pick<StatisticsItem,'id'|'type'|'name'|'platform'>;
export type StatisticsSummary = { views:number; clicks:number; whatsapp:number };
const empty = ():StatisticsSummary => ({views:0,clicks:0,whatsapp:0});

export function summarizeStatistics(rows:StatisticsRow[], from:string, to:string, catalog:StatisticsCatalogItem[] = []) {
    const current=empty(), previous=empty(), byItem=new Map<string,StatisticsItem>(), days=new Map<string,StatisticsSummary>();
    for(const item of catalog) byItem.set(`${item.type}:${item.id}`,{...item,...empty()});
    const start=Date.parse(from+'T00:00:00Z'), end=Date.parse(to+'T00:00:00Z');
    for(let time=start;time<=end;time+=86400000) days.set(new Date(time).toISOString().slice(0,10),empty());
    for(const row of rows) {
        const metric = row.metric === 'view' ? 'views' : row.metric === 'click' ? 'clicks' : 'whatsapp';
        if(row.day < from) { previous[metric]+=row.count; continue; }
        if(row.day > to) continue;
        current[metric]+=row.count;
        const day=days.get(row.day); if(day) day[metric]+=row.count;
        const key=`${row.type}:${row.id}`;
        if(!byItem.has(key)) byItem.set(key,{id:row.id,type:row.type,name:row.name,platform:row.platform,...empty()});
        byItem.get(key)![metric]+=row.count;
    }
    return {current,previous,items:[...byItem.values()],days:[...days.entries()].map(([day,counts])=>({day,...counts}))};
}

export function percentChange(current:number, previous:number):string {
    if(previous===0) return current===0 ? 'Sem alteração' : 'Sem dados no período anterior';
    const value=Math.round((current-previous)*100/previous);
    return `${value>0?'+':''}${value}% em relação ao período anterior`;
}
