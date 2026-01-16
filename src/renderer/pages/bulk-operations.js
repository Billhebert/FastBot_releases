/**
 * Bulk Operations Module
 * Fornece funcionalidades de seleção múltipla e ações em lote
 */

class BulkOperations {
  constructor(options = {}) {
    this.selectedIds = new Set();
    this.onSelectionChange = options.onSelectionChange || (() => {});
    this.tableName = options.tableName || '';
  }

  // Inicializar bulk operations em uma tabela
  init(tableSelector) {
    const table = document.querySelector(tableSelector);
    if (!table) return;

    // Adicionar checkbox "Selecionar Todos" no header
    const thead = table.querySelector('thead tr');
    if (thead && !thead.querySelector('.bulk-select-all')) {
      const th = document.createElement('th');
      th.innerHTML = `
        <input type="checkbox" class="bulk-select-all" title="Selecionar todos">
      `;
      thead.insertBefore(th, thead.firstChild);
    }

    // Event listener para "Selecionar Todos"
    const selectAllCheckbox = table.querySelector('.bulk-select-all');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        this.toggleSelectAll(e.target.checked, tableSelector);
      });
    }
  }

  // Adicionar checkbox a uma linha
  addCheckboxToRow(row, itemId) {
    const td = document.createElement('td');
    td.innerHTML = `
      <input type="checkbox" class="bulk-select-item" data-id="${itemId}"
        ${this.selectedIds.has(itemId) ? 'checked' : ''}>
    `;
    row.insertBefore(td, row.firstChild);

    // Event listener
    const checkbox = td.querySelector('.bulk-select-item');
    checkbox.addEventListener('change', (e) => {
      this.toggleItem(itemId, e.target.checked);
    });
  }

  // Selecionar/desselecionar todos
  toggleSelectAll(checked, tableSelector) {
    const checkboxes = document.querySelectorAll(`${tableSelector} .bulk-select-item`);

    checkboxes.forEach(checkbox => {
      const itemId = checkbox.dataset.id;
      checkbox.checked = checked;

      if (checked) {
        this.selectedIds.add(itemId);
      } else {
        this.selectedIds.delete(itemId);
      }
    });

    this.updateUI();
    this.onSelectionChange(this.selectedIds.size);
  }

  // Selecionar/desselecionar item individual
  toggleItem(itemId, checked) {
    if (checked) {
      this.selectedIds.add(itemId);
    } else {
      this.selectedIds.delete(itemId);
    }

    this.updateUI();
    this.onSelectionChange(this.selectedIds.size);
  }

  // Atualizar UI (checkbox "Selecionar Todos")
  updateUI() {
    const selectAllCheckbox = document.querySelector('.bulk-select-all');
    const allCheckboxes = document.querySelectorAll('.bulk-select-item');

    if (selectAllCheckbox && allCheckboxes.length > 0) {
      const checkedCount = Array.from(allCheckboxes).filter(cb => cb.checked).length;
      selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
      selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
    }
  }

  // Obter IDs selecionados
  getSelectedIds() {
    return Array.from(this.selectedIds);
  }

  // Limpar seleção
  clearSelection() {
    this.selectedIds.clear();

    const checkboxes = document.querySelectorAll('.bulk-select-item');
    checkboxes.forEach(cb => cb.checked = false);

    const selectAll = document.querySelector('.bulk-select-all');
    if (selectAll) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }

    this.onSelectionChange(0);
  }

  // Contador de selecionados
  getSelectionCount() {
    return this.selectedIds.size;
  }

  // Criar barra de ações em lote
  createBulkActionsBar(actions = []) {
    const bar = document.createElement('div');
    bar.className = 'bulk-actions-bar';
    bar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
      border: 2px solid #d4af37;
      border-radius: 12px;
      padding: 20px 30px;
      display: flex;
      align-items: center;
      gap: 15px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      transition: transform 0.3s ease;
    `;

    bar.innerHTML = `
      <span style="color: #d4af37; font-weight: 600; font-size: 14px;">
        <span id="bulk-count">0</span> itens selecionados
      </span>
      <div style="display: flex; gap: 10px;" id="bulk-actions-buttons"></div>
      <button onclick="bulkOps.clearSelection()"
        style="background: #333; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600;">
        ✕ Limpar
      </button>
    `;

    // Adicionar botões de ação
    const buttonsContainer = bar.querySelector('#bulk-actions-buttons');
    actions.forEach(action => {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.style.cssText = `
        background: ${action.color || '#d4af37'};
        color: ${action.textColor || '#1a1a1a'};
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      `;
      button.addEventListener('click', () => action.handler(this.getSelectedIds()));
      button.addEventListener('mouseenter', (e) => {
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
      });
      button.addEventListener('mouseleave', (e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = 'none';
      });
      buttonsContainer.appendChild(button);
    });

    document.body.appendChild(bar);
    return bar;
  }

  // Mostrar/ocultar barra de ações
  toggleActionsBar(show) {
    const bar = document.querySelector('.bulk-actions-bar');
    if (bar) {
      bar.style.transform = show
        ? 'translateX(-50%) translateY(0)'
        : 'translateX(-50%) translateY(100px)';

      // Atualizar contador
      const counter = bar.querySelector('#bulk-count');
      if (counter) {
        counter.textContent = this.selectedIds.size;
      }
    }
  }

  // Excluir múltiplos itens
  async bulkDelete(supabaseClient, tableName, userId = null) {
    const ids = this.getSelectedIds();
    if (ids.length === 0) {
      return { success: false, error: 'Nenhum item selecionado' };
    }

    const confirmMsg = `Confirma a exclusão de ${ids.length} ${ids.length === 1 ? 'item' : 'itens'}?`;
    if (!confirm(confirmMsg)) {
      return { success: false, error: 'Cancelado pelo usuário' };
    }

    try {
      let query = supabaseClient
        .from(tableName)
        .delete()
        .in('id', ids);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) throw error;

      this.clearSelection();
      return { success: true, deletedCount: ids.length };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Atualizar múltiplos itens
  async bulkUpdate(supabaseClient, tableName, updates, userId = null) {
    const ids = this.getSelectedIds();
    if (ids.length === 0) {
      return { success: false, error: 'Nenhum item selecionado' };
    }

    try {
      let query = supabaseClient
        .from(tableName)
        .update(updates)
        .in('id', ids);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) throw error;

      this.clearSelection();
      return { success: true, updatedCount: ids.length };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Exportar selecionados como CSV
  exportSelectedAsCSV(data, filename = 'export.csv') {
    const ids = this.getSelectedIds();
    if (ids.length === 0) {
      alert('Nenhum item selecionado para exportar');
      return;
    }

    const selectedData = data.filter(item => ids.includes(item.id));

    if (selectedData.length === 0) {
      alert('Nenhum dado encontrado para exportar');
      return;
    }

    // Gerar CSV
    const headers = Object.keys(selectedData[0]).join(',');
    const rows = selectedData.map(item =>
      Object.values(item).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );

    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}

// Exportar para uso global
window.BulkOperations = BulkOperations;
