import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeStatistics, percentChange, type StatisticsRow } from '../src/app/admin/statistics-data.ts';

test('daily and per-item totals separate the selected period from an equal previous period', () => {
    const row=(day:string,type:StatisticsRow['type'],metric:StatisticsRow['metric'],count:number,id='one'):StatisticsRow=>({day,type,metric,count,id,source:'home',name:id,platform:''});
    const summary=summarizeStatistics([
        row('2026-10-01','shop','view',4),row('2026-10-02','shop','click',2),
        row('2026-10-03','shop','view',7),row('2026-10-03','shop','whatsapp',1),
        row('2026-10-04','supplier','click',3,'two'),row('2026-10-04','article','view',5,'three'),
    ],'2026-10-03','2026-10-04');
    assert.deepEqual(summary.current,{views:12,clicks:3,whatsapp:1});
    assert.deepEqual(summary.previous,{views:4,clicks:2,whatsapp:0});
    assert.deepEqual(summary.days.map(d=>[d.day,d.views,d.clicks,d.whatsapp]),[['2026-10-03',7,0,1],['2026-10-04',5,3,0]]);
    assert.deepEqual(summary.items.map(i=>[i.id,i.views,i.clicks,i.whatsapp]),[['one',7,0,1],['two',0,3,0],['three',5,0,0]]);
    assert.equal(percentChange(12,4),'+200% em relação ao período anterior');
    assert.equal(percentChange(2,0),'Sem dados no período anterior');
});

test('empty dates remain visible in the daily series', () => {
    const summary=summarizeStatistics([],'2026-10-30','2026-11-01',[{id:'new',type:'shop',name:'Novo produto',platform:''}]);
    assert.deepEqual(summary.days.map(d=>d.day),['2026-10-30','2026-10-31','2026-11-01']);
    assert.deepEqual(summary.items.map(item=>[item.name,item.views,item.clicks]),[['Novo produto',0,0]]);
    assert.equal(percentChange(0,0),'Sem alteração');
});
