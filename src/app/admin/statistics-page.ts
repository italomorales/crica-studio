import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AllCommunityModule, ModuleRegistry, createGrid, type GridApi } from 'ag-grid-community';
import { AdminShellComponent } from './admin-shell';
import { catalogGridLocale, catalogGridTheme } from './catalog-grid';
import { API_URL, AuthService } from '../services/auth.service';
import { summarizeStatistics, percentChange, type StatisticsRow, type StatisticsItem, type StatisticsCatalogItem } from './statistics-data';
import template from './statistics-page.html?raw';
import './statistics-page.css';
ModuleRegistry.registerModules([AllCommunityModule]);

function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function offset(day:string, count:number) { const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10); }

@Component({selector:'crica-statistics-page',standalone:true,imports:[AdminShellComponent,FormsModule],template})
export class StatisticsPageComponent implements AfterViewInit, OnDestroy {
    private auth=inject(AuthService);
    private changeDetector=inject(ChangeDetectorRef);
    @ViewChild('grid',{static:true}) grid!:ElementRef<HTMLElement>;
    private api?:GridApi<StatisticsItem>;
    private request=0;
    from=offset(today(),-29); to=today(); type='all'; search=''; loading=false; error='';
    appliedFrom=this.from; appliedTo=this.to;
    selectedItem=''; allItems:StatisticsItem[]=[]; private allRows:StatisticsRow[]=[]; private catalog:StatisticsCatalogItem[]=[];
    result=summarizeStatistics([],this.from,this.to);
    readonly change=percentChange;
    ngAfterViewInit() {
        this.api=createGrid<StatisticsItem>(this.grid.nativeElement,{
            theme:catalogGridTheme, localeText:catalogGridLocale, rowData:[], pagination:true, paginationPageSize:20,
            paginationPageSizeSelector:false, rowHeight:56, headerHeight:46,
            defaultColDef:{sortable:true,resizable:true,suppressMovable:true},
            columnDefs:[
                {headerName:'Conteúdo',field:'name',minWidth:250,flex:2},
                {headerName:'Área',field:'type',width:130,valueFormatter:p=>({shop:'Loja',supplier:'Fornecedores',article:'News'} as Record<string,string>)[p.value]||p.value},
                {headerName:'Plataforma',field:'platform',width:150,valueFormatter:p=>p.value||'—'},
                {headerName:'Visualizações',field:'views',width:150,valueFormatter:p=>p.data?.type==='supplier'?'—':String(p.value ?? 0)},
                {headerName:'Cliques',field:'clicks',width:120,valueFormatter:p=>p.data?.type==='article'?'—':String(p.value ?? 0)},
                {headerName:'WhatsApp',field:'whatsapp',width:135,valueFormatter:p=>p.data?.type!=='shop'?'—':String(p.value ?? 0)},
            ],
        });
        void this.load();
    }
    ngOnDestroy(){ ++this.request; this.api?.destroy(); }
    preset(days:number){ this.to=today();this.from=offset(this.to,1-days);void this.load(); }
    filter(){ this.api?.setGridOption('quickFilterText',this.search); }
    async load(){
        if(!this.from||!this.to||this.from>this.to || (Date.parse(this.to)-Date.parse(this.from))/86400000>365){this.error='Selecione um período válido de até 366 dias.';return;}
        const token=this.auth.accessToken(); if(!token){this.error='Sua sessão expirou. Entre novamente.';return;}
        const request=++this.request; this.loading=true;this.error='';
        const from=this.from, to=this.to, type=this.type;
        try {
            const params=new URLSearchParams({from,to,type});
            const response=await fetch(`${API_URL}/api/admin/statistics?${params}`,{headers:{Authorization:`Bearer ${token}`}});
            if(!response.ok) throw new Error(response.status===401?'Sua sessão expirou. Entre novamente.':'Não foi possível carregar as estatísticas. Tente novamente.');
            const data=await response.json() as {rows:StatisticsRow[];catalog:StatisticsCatalogItem[]};
            if(request!==this.request)return;
            this.appliedFrom=from; this.appliedTo=to; this.allRows=data.rows; this.catalog=data.catalog;
            this.allItems=summarizeStatistics(data.rows,from,to,data.catalog).items;
            if(this.selectedItem && !this.allItems.some(item=>`${item.type}:${item.id}`===this.selectedItem)) this.selectedItem='';
            this.applySelection();
        } catch(error){if(request===this.request)this.error=error instanceof Error?error.message:'Não foi possível carregar as estatísticas.';}
        finally{if(request===this.request){this.loading=false;this.changeDetector.markForCheck();}}
    }
    applySelection(){
        const rows=this.selectedItem ? this.allRows.filter(row=>`${row.type}:${row.id}`===this.selectedItem) : this.allRows;
        const catalog=this.selectedItem ? this.catalog.filter(item=>`${item.type}:${item.id}`===this.selectedItem) : this.catalog;
        this.result=summarizeStatistics(rows,this.appliedFrom,this.appliedTo,catalog);
        this.api?.setGridOption('rowData',this.result.items);
    }
    points(key:'views'|'clicks'|'whatsapp') {
        const days=this.result.days, max=Math.max(1,...days.flatMap(d=>[d.views,d.clicks,d.whatsapp]));
        return days.map((day,i)=>`${10+(days.length===1?390:i*780/(days.length-1))},${180-day[key]*155/max}`).join(' ');
    }
    label(day:string){ return new Date(day+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',timeZone:'UTC'}); }
}
