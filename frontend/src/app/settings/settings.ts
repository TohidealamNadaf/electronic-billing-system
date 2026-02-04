import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  template: `
    <div class="max-w-6xl mx-auto animate-fade-in space-y-4 pb-12">
      <!-- Page Header -->
      <div class="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm mb-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l.7 2.147a1 1 0 0 0 .95.69h2.262c.969 0 1.371 1.24.588 1.81l-1.833 1.333a1 1 0 0 0-.364 1.118l.7 2.147c.3.921-.755 1.688-1.54 1.118l-1.833-1.333a1 1 0 0 0-1.175 0L9.262 13.99c-.784.57-1.838-.197-1.539-1.118l.7-2.147a1 1 0 0 0-.364-1.118L6.226 7.574c-.783-.57-.38-1.81.588-1.81h2.262a1 1 0 0 0 .95-.69l.7-2.147z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-display font-bold text-slate-900">System Settings</h2>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Control company identity, invoice layout and behaviour used across all documents.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div *ngIf="successMessage()" class="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-[11px] font-bold animate-fade-in">
              <svg class="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
              Changes Saved
          </div>
          <span class="hidden md:inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-200">
            Configuration
          </span>
          <button (click)="saveSettings()" [disabled]="saving()"
            class="px-5 py-2 bg-primary-600 text-white rounded-full text-[11px] font-bold uppercase hover:bg-primary-700 shadow-sm flex items-center gap-2 disabled:opacity-60">
            <span *ngIf="saving()" class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
             {{ saving() ? 'SAVING...' : 'SAVE SETTINGS' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        <!-- Sidebar Navigation -->
        <div class="lg:col-span-1 space-y-4">
          <div class="bg-white border border-slate-200 rounded shadow-sm overflow-hidden sticky top-4">
            <div class="p-3 bg-slate-50 border-b border-slate-200 uppercase tracking-widest text-[9px] font-black text-slate-400">Settings Menu</div>
            <nav class="p-1.5 space-y-1">
              <button *ngFor="let tab of tabs" 
                (click)="activeTab.set(tab.id)"
                [class]="activeTab() === tab.id 
                  ? 'bg-primary-50 text-primary-700 border-primary-100 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 font-medium border-transparent'"
                class="w-full flex items-center gap-3 px-3 py-2.5 text-xs rounded border text-left group">
                <svg class="w-4 h-4 transition-colors" [class.text-primary-600]="activeTab() === tab.id"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="tab.icon" />
                </svg>
                <span class="truncate">{{ tab.label }}</span>
              </button>
            </nav>
            <div class="p-4 bg-slate-50 mt-2 m-1.5 rounded text-[10px] text-slate-500 leading-relaxed border border-slate-200">
               <span class="text-slate-900 font-bold">INFO:</span> Global settings affect all document exports and formula calculations across the system.
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="lg:col-span-3">
          <div class="bg-white border border-slate-200 rounded shadow-sm min-h-[500px] flex flex-col">
            
            <!-- HEADER OF CARD -->
            <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {{ tabs[0].id === activeTab() ? 'Business Identity' : 
                   tabs[1].id === activeTab() ? 'Field Arrangement' : 
                   tabs[2].id === activeTab() ? 'System Preferences' : 'Table Engine' }}
              </h3>
              <div class="flex gap-2">
                <button *ngIf="activeTab() === 'display'" (click)="addBusinessCustomField()" 
                  class="text-[9px] font-bold text-primary-600 bg-white border border-primary-200 px-2 py-1 rounded hover:bg-primary-50">
                  + ADD CUSTOM DETAIL
                </button>
                <button *ngIf="activeTab() === 'table'" (click)="addCustomColumn()" 
                  class="text-[9px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50">
                  + ADD COLUMN
                </button>
              </div>
            </div>

            <div class="p-6 flex-1">
              <!-- TAB: PROFILE -->
              <div *ngIf="activeTab() === 'profile'" class="animate-tab space-y-8">
                <div class="grid md:grid-cols-2 gap-8">
                  <div class="space-y-5">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Company Registered Name</label>
                      <input type="text" [(ngModel)]="settings.companyName" 
                        class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Proprietor / Signatory</label>
                      <input type="text" [(ngModel)]="settings.companyOwner" 
                        class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                  </div>

                  <div class="bg-primary-50 border border-primary-100 rounded p-5 relative overflow-hidden">
                    <p class="text-[10px] font-black text-primary-700 uppercase mb-4 tracking-widest relative z-10">Branding Preference</p>
                    <div class="space-y-2 relative z-10">
                      <div *ngFor="let type of ['company','owner']" 
                        (click)="settings.businessProfileConfig.nameDisplayType = type"
                        [class]="settings.businessProfileConfig.nameDisplayType === type ? 'border-primary-400 bg-white shadow-sm ring-1 ring-primary-400/20' : 'border-primary-200/50 opacity-60 bg-white/50'"
                        class="flex items-center justify-between px-4 py-3 border rounded cursor-pointer hover:bg-white group">
                        <span class="text-[11px] font-bold uppercase tracking-tight" [class.text-primary-800]="settings.businessProfileConfig.nameDisplayType === type">
                          {{ type === 'company' ? 'Show Company Name' : 'Show Owner Name' }}
                        </span>
                        <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                             [class.border-primary-500]="settings.businessProfileConfig.nameDisplayType === type"
                             [class.border-slate-300]="settings.businessProfileConfig.nameDisplayType !== type">
                          <div *ngIf="settings.businessProfileConfig.nameDisplayType === type" class="w-2 h-2 rounded-full bg-primary-500"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB: DISPLAY ORDER -->
              <div *ngIf="activeTab() === 'display'" class="animate-tab space-y-4">
                <div class="space-y-2" (dragover)="$event.preventDefault()">
                  <div *ngFor="let field of settings.businessProfileConfig.displayFields; let i = index" 
                    draggable="true" (dragstart)="onDragStart(i)" (dragover)="onDragOver($event, i)" (drop)="onDrop(i)"
                    class="group flex items-center gap-4 p-3 bg-white border border-slate-200 rounded hover:border-primary-300 hover:shadow-sm cursor-move">
                    
                    <div class="text-slate-300 group-hover:text-primary-400 flex-shrink-0">
                      <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 8h16M4 16h16" /></svg>
                    </div>

                    <div class="flex-1 grid grid-cols-12 gap-4 items-center">
                      <div class="col-span-3">
                         <div class="flex flex-col">
                            <input *ngIf="!field.isBuiltIn" type="text" [(ngModel)]="field.key" class="w-full bg-transparent border-none text-[11px] font-bold text-slate-800 p-0 focus:ring-0 uppercase tracking-tight" placeholder="Field Label...">
                            <span *ngIf="field.isBuiltIn" class="text-[11px] font-bold text-slate-800 uppercase tracking-tight">{{ field.key }}</span>
                            <span class="text-[8px] font-black text-slate-400 uppercase active:font-primary-600">{{ field.isBuiltIn ? 'System' : 'Custom' }}</span>
                         </div>
                      </div>

                      <div class="col-span-7">
                        <textarea *ngIf="field.type === 'textarea'" [(ngModel)]="settings.companyAddress" rows="1" class="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold focus:bg-white focus:border-primary-500 outline-none resize-none"></textarea>
                        <input *ngIf="field.type === 'text' && field.id === 'phone'" type="text" [(ngModel)]="settings.companyPhone" class="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold focus:bg-white focus:border-primary-500 outline-none">
                        <input *ngIf="field.type === 'text' && field.id === 'gst'" type="text" [(ngModel)]="settings.gstNumber" class="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold focus:bg-white focus:border-primary-500 outline-none">
                        <input *ngIf="!field.isBuiltIn" type="text" [(ngModel)]="field.value" class="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-bold focus:bg-white focus:border-primary-500 outline-none text-slate-700" placeholder="Enter detail...">
                      </div>

                      <div class="col-span-2 flex items-center justify-end gap-3">
                        <label class="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                          <input type="checkbox" [(ngModel)]="field.show" class="sr-only peer">
                          <div class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 relative"></div>
                        </label>
                        <button *ngIf="!field.isBuiltIn" (click)="removeBusinessCustomField(i)" class="text-slate-300 hover:text-red-500 transition-colors p-1">
                          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB: PREFERENCES -->
              <div *ngIf="activeTab() === 'layout'" class="animate-tab space-y-8">
                 <div class="grid md:grid-cols-2 gap-4">
                    <div *ngFor="let mod of [{ k:'isGstEnabled', t:'Taxation (GST)', d:'Global tax engine' }, { k:'isDiscountEnabled', t:'Discount System', d:'Line-item reductions' }]"
                      class="flex items-center justify-between p-4 bg-white border border-slate-200 rounded hover:border-primary-300 shadow-sm">
                      <div class="flex items-center gap-3">
                        <div class="w-1.5 h-6 bg-primary-600 rounded-full"></div>
                        <div>
                          <span class="text-[11px] font-black block text-slate-800 uppercase tracking-tight">{{mod.t}}</span>
                          <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{{mod.d}}</span>
                        </div>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" [(ngModel)]="settings[mod.k]" class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-inner"></div>
                      </label>
                    </div>
                 </div>

                 <!-- Terms and Conditions -->
                 <div class="space-y-3 pt-6 border-t border-slate-100">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Terms and Conditions</h4>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer scale-90">
                      <input type="checkbox" [(ngModel)]="settings.showTerms" class="sr-only peer">
                      <div class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                    </label>
                  </div>
                  <textarea [(ngModel)]="settings.termsAndConditions" 
                    [disabled]="!settings.showTerms"
                    class="w-full bg-slate-50 border border-slate-200 rounded p-4 text-[13px] font-semibold text-slate-600 leading-relaxed min-h-[160px] focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-40"
                    placeholder="Enter permanent terms, bank details, or policy notes..."></textarea>
                  <p class="text-[9px] text-slate-400 italic">This content will appear at the bottom of all Invoices and Estimates.</p>
                 </div>
              </div>

              <!-- TAB: TABLE SETUP -->
              <div *ngIf="activeTab() === 'table'" class="animate-tab space-y-6">
                <!-- Instruction Alert -->
                <div class="bg-primary-900/5 border border-primary-200 rounded p-4 flex gap-4 items-center">
                  <div class="bg-primary-600 text-white p-2 rounded shadow-lg">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <h4 class="text-xs font-black text-primary-900 uppercase tracking-widest">Unified Column Control</h4>
                    <p class="text-[10px] text-primary-700 font-bold mt-0.5">Drag any column (Built-in or Custom) to reorder. Labels are fully editable.</p>
                  </div>
                </div>

                <div class="space-y-3" (dragover)="$event.preventDefault()">
                  <div *ngFor="let col of customColumns; let i = index" 
                    draggable="true" (dragstart)="onColumnDragStart(i)" (dragover)="onColumnDragOver($event, i)" (drop)="onColumnDrop(i)"
                    class="bg-white border border-slate-200 rounded p-5 hover:border-primary-300 shadow-sm flex flex-col gap-5 relative group cursor-move"
                    [class.bg-slate-50]="col.isBuiltIn"
                    [class.border-l-4]="col.isBuiltIn"
                    [class.border-l-primary-500]="col.isBuiltIn">
                    
                    <!-- Drag handle indicator -->
                    <div class="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
                      <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 8h16M4 16h16" /></svg>
                    </div>

                    <div class="flex items-center justify-between">
                       <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shadow-sm"
                         [class.bg-primary-600]="col.isBuiltIn" [class.text-white]="col.isBuiltIn" [class.border-primary-400]="col.isBuiltIn"
                         [class.bg-white]="!col.isBuiltIn" [class.text-slate-400]="!col.isBuiltIn" [class.border-slate-200]="!col.isBuiltIn">
                          {{ col.isBuiltIn ? (col.id === 'total' ? 'System Calculated' : 'Core Column') : 'Custom field' }}
                       </span>
                       <button *ngIf="!col.isBuiltIn" (click)="removeCustomColumn(i)" class="text-slate-300 hover:text-red-500 transition-colors">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                     
                     <div class="grid lg:grid-cols-3 gap-6">
                        <!-- Built-in Column: Label Only -->
                        <div *ngIf="col.isBuiltIn" class="lg:col-span-3">
                           <div class="grid grid-cols-2 gap-4">
                              <div>
                                 <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">System Function</label>
                                 <div class="px-3 py-2 bg-slate-100 rounded text-xs font-bold text-slate-500 border border-slate-200 shadow-inner">
                                    {{ col.id === 'product' ? 'Description Box' : col.id === 'quantity' ? 'Quantity Counter' : col.id === 'price' ? 'Base Unit Price' : 'Automatic Total (Price × Qty)' }}
                                 </div>
                              </div>
                              <div>
                                 <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Display Label (Alias)</label>
                                 <input type="text" [(ngModel)]="columnLabels[col.id]" 
                                    class="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm font-black uppercase tracking-tight text-slate-800 focus:border-primary-500 outline-none shadow-sm"
                                    [placeholder]="col.id">
                              </div>
                           </div>
                        </div>

                        <!-- Custom Column: Name, Type, Calc -->
                        <ng-container *ngIf="!col.isBuiltIn">
                          <div>
                             <label class="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Column Display Title</label>
                             <input type="text" [(ngModel)]="col.name" 
                              class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:bg-white focus:border-primary-500 outline-none shadow-sm">
                          </div>
                          <div>
                             <label class="block text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Behavior</label>
                             <ng-select [items]="columnTypes" bindLabel="label" bindValue="value" [(ngModel)]="col.type" [clearable]="false" [searchable]="false" class="custom-select-v2"></ng-select>
                          </div>
                          <div class="flex items-center pt-5">
                            <label class="flex items-center gap-2 cursor-pointer group/chk">
                              <input type="checkbox" [(ngModel)]="col.isCurrency" class="w-3.5 h-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500">
                              <span class="text-[10px] font-black text-slate-600 uppercase tracking-wider group-hover/chk:text-primary-600">Currency (₹)</span>
                            </label>
                          </div>

                          <div *ngIf="col.type === 'calculated'" class="lg:col-span-3 bg-primary-50/30 p-4 rounded border border-primary-200/50 flex flex-col gap-3">
                            <div class="flex items-center justify-between">
                               <span class="text-[9px] font-black text-primary-700 uppercase tracking-widest">Formula Console</span>
                               <p class="text-[10px] text-primary-600 font-bold italic">use: price, qty</p>
                            </div>
                            <div class="relative">
                              <input type="text" [(ngModel)]="col.formula" 
                                class="w-full bg-white border border-primary-200 rounded px-4 py-2 text-xs font-mono font-bold text-primary-900 focus:border-primary-500 outline-none pr-10 shadow-inner" 
                                placeholder="e.g. price * qty * 1.18">
                              <div class="absolute right-3 top-1/2 -translate-y-1/2 text-primary-200 font-black italic select-none">ƒx</div>
                            </div>
                          </div>
                        </ng-container>
                     </div>
                  </div>
                </div>

                <div *ngIf="customColumns.length === 0" class="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded flex flex-col items-center gap-2">
                   <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                   <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Engine is Offline</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
    .animate-tab { animation: tabIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes tabIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    ::ng-deep .custom-select-v2 .ng-select-container {
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 0.5rem !important;
      min-height: 40px !important;
      padding: 0 4px !important;
    }
    ::ng-deep .custom-select-v2.ng-select-focused .ng-select-container {
      border-color: #10b981 !important;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.05) !important;
      background-color: #ffffff !important;
    }
    ::ng-deep .custom-select-v2 .ng-value-label, ::ng-deep .custom-select-v2 .ng-placeholder {
      font-size: 0.75rem !important;
      font-weight: 700 !important;
      color: #334155 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.025em !important;
    }
  `]
})
export class SettingsComponent implements OnInit {
  settings: any = {
    companyName: 'Nadaf Furnitures',
    companyOwner: '',
    companyAddress: '',
    companyPhone: '',
    isGstEnabled: true,
    gstRate: '18%',
    gstNumber: '',
    businessProfileConfig: {
      showName: true,
      nameDisplayType: 'company',
      showAddress: true,
      showContact: true,
      showGst: true,
      displayFields: []
    },
    showTerms: true,
    termsAndConditions: ''
  };

  draggedItemIndex: number | null = null;
  draggedColumnIndex: number | null = null;

  activeTab = signal('profile');
  saving = signal(false);
  successMessage = signal(false);

  tabs = [
    { id: 'profile', label: 'Company Profile', icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6.75h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 15 21h-12a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 3 3Z' },
    { id: 'display', label: 'Display Order', icon: 'M3.75 9h16.5m-16.5 6.75h16.5' },
    { id: 'layout', label: 'Preferences', icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m-9.75 0h9.75' },
    { id: 'table', label: 'Table Setup', icon: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5V6.375c0-.621.504-1.125 1.125-1.125H16.5a1.125 1.125 0 0 1 1.125 1.125v1.5m-3.375 9h-1.5m1.5-1.5h-1.5m1.5-1.5h-1.5m1.5-1.5h-1.5m1.5-1.5h-1.5' }
  ];

  columnLabels: any = { product: 'Description', quantity: 'Qty', price: 'Unit Price', total: 'Total' };
  customColumns: any[] = [];

  columnTypes = [
    { label: '🔢 Calculated', value: 'calculated' },
    { label: '✍️ Manual Text', value: 'text' },
    { label: '📏 Manual Number', value: 'number' }
  ];

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.api.getSettings().subscribe((data: any) => {
      // 1. Robustly parse businessProfileConfig
      let config: any = {
        showName: true,
        nameDisplayType: 'company',
        showAddress: true,
        showContact: true,
        showGst: true,
        displayFields: []
      };
      if (data.businessProfileConfig) {
        try {
          const parsed = typeof data.businessProfileConfig === 'string' ? JSON.parse(data.businessProfileConfig) : data.businessProfileConfig;
          config = { ...config, ...(typeof parsed === 'object' ? parsed : {}) };
          if (!config.nameDisplayType) config.nameDisplayType = 'company';

          // Migration: Map old customFields to new unified displayFields if needed
          if (!config.displayFields || config.displayFields.length === 0) {
            config.displayFields = [
              { id: 'address', key: 'Business Address', show: config.showAddress, isBuiltIn: true, type: 'textarea' },
              { id: 'phone', key: 'Phone Number', show: config.showContact, isBuiltIn: true, type: 'text' },
              { id: 'gst', key: 'GST Number', show: config.showGst, isBuiltIn: true, type: 'text' },
              ...(config as any).customFields?.map((f: any) => ({ ...f, isBuiltIn: false, id: 'custom_' + Math.random() })) || []
            ];
          }
        } catch (e) {
          console.error('Failed to parse config', e);
        }
      }
      data.businessProfileConfig = config;

      // 2. Parse and merge columns for unified reordering
      let mergedCols: any[] = [];
      const builtInDefaults = [
        { id: 'product', isBuiltIn: true },
        { id: 'quantity', isBuiltIn: true },
        { id: 'price', isBuiltIn: true },
        { id: 'total', isBuiltIn: true }
      ];

      if (data.customColumns) {
        try {
          const parsed = JSON.parse(data.customColumns);
          // Migration: if the parsed list doesn't have IDs like 'product', it's the old format (custom only)
          const hasBuiltIn = parsed.some((c: any) => c.isBuiltIn);

          if (!hasBuiltIn) {
            // Old format: build the unified list (Built-ins first, then custom)
            mergedCols = [
              ...builtInDefaults,
              ...parsed.map((c: any) => ({ ...c, isBuiltIn: false, id: 'custom_' + Math.random().toString(36).substr(2, 9) }))
            ];
          } else {
            mergedCols = parsed;
          }
        } catch (e) {
          mergedCols = [...builtInDefaults];
        }
      } else {
        mergedCols = [...builtInDefaults];
      }

      this.customColumns = mergedCols.map((c: any) => ({
        ...c,
        name: c.isBuiltIn ? '' : (c.name || ''),
        type: c.isBuiltIn ? '' : (c.type || 'calculated'),
        formula: c.isBuiltIn ? '' : (c.formula || ''),
        isCurrency: c.isCurrency !== undefined ? c.isCurrency : true
      }));

      this.settings = data;
    });
  }

  addCustomColumn() {
    this.customColumns.push({ id: 'custom_' + Math.random().toString(36).substr(2, 9), name: '', type: 'calculated', formula: '', isCurrency: true, isBuiltIn: false });
  }

  removeCustomColumn(index: number) {
    if (this.customColumns[index].isBuiltIn) return;
    this.customColumns.splice(index, 1);
  }

  addBusinessCustomField() {
    this.settings.businessProfileConfig.displayFields.push({
      id: 'custom_' + Date.now(),
      key: '',
      value: '',
      show: true,
      isBuiltIn: false
    });
  }

  removeBusinessCustomField(index: number) {
    this.settings.businessProfileConfig.displayFields.splice(index, 1);
  }

  onDragStart(index: number) {
    this.draggedItemIndex = index;
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
  }

  onDrop(dropIndex: number) {
    if (this.draggedItemIndex === null) return;

    const fields = this.settings.businessProfileConfig.displayFields;
    const draggedItem = fields[this.draggedItemIndex];

    fields.splice(this.draggedItemIndex, 1);
    fields.splice(dropIndex, 0, draggedItem);

    this.draggedItemIndex = null;
  }

  onColumnDragStart(index: number) {
    this.draggedColumnIndex = index;
  }

  onColumnDragOver(event: DragEvent, index: number) {
    event.preventDefault();
  }

  onColumnDrop(dropIndex: number) {
    if (this.draggedColumnIndex === null) return;

    const draggedItem = this.customColumns[this.draggedColumnIndex];
    this.customColumns.splice(this.draggedColumnIndex, 1);
    this.customColumns.splice(dropIndex, 0, draggedItem);

    this.draggedColumnIndex = null;
  }

  saveSettings() {
    this.saving.set(true);

    // Update individual show flags based on displayFields order/status
    const fields = this.settings.businessProfileConfig.displayFields;
    this.settings.businessProfileConfig.showAddress = fields.find((f: any) => f.id === 'address')?.show ?? true;
    this.settings.businessProfileConfig.showContact = fields.find((f: any) => f.id === 'phone')?.show ?? true;
    this.settings.businessProfileConfig.showGst = fields.find((f: any) => f.id === 'gst')?.show ?? true;

    const toSave = {
      ...this.settings,
      columnLabels: JSON.stringify(this.columnLabels),
      customColumns: JSON.stringify(this.customColumns),
      businessProfileConfig: JSON.stringify(this.settings.businessProfileConfig)
    };

    this.api.updateSettings(toSave).subscribe({
      next: (updated: any) => {
        // Ensure we parse back for the UI
        try {
          updated.businessProfileConfig = JSON.parse(updated.businessProfileConfig);
          updated.columnLabels = JSON.parse(updated.columnLabels);
          updated.customColumns = JSON.parse(updated.customColumns);
        } catch (e) { }

        this.settings = updated;
        this.columnLabels = updated.columnLabels;
        this.customColumns = updated.customColumns;

        this.saving.set(false);
        this.successMessage.set(true);
        setTimeout(() => this.successMessage.set(false), 3000);
      },
      error: () => {
        this.saving.set(false);
        alert('Failed to save settings');
      }
    });
  }
}
