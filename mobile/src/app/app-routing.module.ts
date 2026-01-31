import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'invoice-entry',
    loadComponent: () => import('./invoice-entry/invoice-entry.page').then(m => m.InvoiceEntryPage)
  },
  {
    path: 'client-management',
    loadComponent: () => import('./client-management/client-management.page').then(m => m.ClientManagementPage)
  },
  {
    path: 'product-management',
    loadComponent: () => import('./product-management/product-management.page').then(m => m.ProductManagementPage)
  },
  {
    path: '',
    redirectTo: 'invoice-entry',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
