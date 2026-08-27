// ---------------------------------------------------------------------------
// Motor de comprobación de compatibilidad.
// IMPORTANTE (decisión didáctica): esto NO se ejecuta al añadir piezas.
// Sólo se llama cuando el alumnado pulsa el botón "Comprobar compatibilidad",
// para que primero razonen ellos y después contrasten.
// ---------------------------------------------------------------------------

import { BY_ID } from './data/catalog.js';

/** Consumo aproximado de cada unidad de almacenamiento, en vatios. */
const STORAGE_W = { nvme: 8, 'sata-ssd': 3, hdd: 9 };

function comps(build, cat) {
  return build.items.filter(i => BY_ID[i.compId].cat === cat).map(i => BY_ID[i.compId]);
}
function one(build, cat) {
  return comps(build, cat)[0] || null;
}

function issue(level, title, detail, parts) {
  return { level, title, detail, parts: parts || [] };
}

/** Potencia estimada del montaje y potencia de fuente recomendada. */
export function estimatePower(build) {
  const cpu = one(build, 'cpu');
  const gpu = one(build, 'gpu');
  const mb = one(build, 'motherboard');
  let total = 0;
  const rows = [];
  if (cpu) { total += cpu.specs.tdp; rows.push([cpu.name, cpu.specs.tdp]); }
  if (gpu) { total += gpu.specs.tdp; rows.push([gpu.name, gpu.specs.tdp]); }
  if (mb) { total += 40; rows.push(['Placa base y puertos', 40]); }
  const ram = comps(build, 'ram');
  if (ram.length) { const w = ram.length * 5; total += w; rows.push([ram.length + ' módulo(s) de RAM', w]); }
  const st = comps(build, 'storage');
  if (st.length) {
    const w = st.reduce((a, c) => a + STORAGE_W[c.specs.kind], 0);
    total += w; rows.push([st.length + ' unidad(es) de almacenamiento', w]);
  }
  const fans = comps(build, 'fan');
  const cooler = one(build, 'cooler');
  let fanCount = fans.length + (cooler ? cooler.specs.fans : 0);
  if (fanCount) { const w = Math.round(fanCount * 2.5); total += w; rows.push([fanCount + ' ventilador(es)', w]); }
  if (cooler && cooler.specs.radiator) { total += 5; rows.push(['Bomba de la refrigeración líquida', 5]); }
  const odd = one(build, 'optical');
  if (odd) { total += 15; rows.push([odd.name, 15]); }
  const exp = comps(build, 'expansion');
  if (exp.length) { const w = exp.length * 8; total += w; rows.push([exp.length + ' tarjeta(s) de expansión', w]); }

  // Margen del 40 %: picos de consumo, envejecimiento y eficiencia de la fuente.
  const recommended = Math.max(300, Math.ceil((total * 1.4) / 50) * 50);
  return { total, recommended, rows };
}

export function totalPrice(build) {
  return build.items.reduce((a, i) => a + BY_ID[i.compId].price, 0);
}

/**
 * Comprueba todo el montaje.
 * @returns {{issues: Array, errors: number, warnings: number, power: object}}
 */
export function checkBuild(build) {
  const out = [];
  const box = one(build, 'case');
  const mb = one(build, 'motherboard');
  const cpu = one(build, 'cpu');
  const cooler = one(build, 'cooler');
  const rams = comps(build, 'ram');
  const gpu = one(build, 'gpu');
  const storages = comps(build, 'storage');
  const psu = one(build, 'psu');
  const fans = comps(build, 'fan');
  const exps = comps(build, 'expansion');
  const odd = one(build, 'optical');
  const power = estimatePower(build);

  // ------------------------------------------------------ 1. Piezas que faltan
  const missing = [];
  if (!box) missing.push('la caja/torre');
  if (!mb) missing.push('la placa base');
  if (!cpu) missing.push('el procesador');
  if (!rams.length) missing.push('la memoria RAM');
  if (!storages.length) missing.push('una unidad de almacenamiento');
  if (!psu) missing.push('la fuente de alimentación');
  if (!cooler && cpu && !cpu.specs.includedCooler) missing.push('el sistema de refrigeración de la CPU');
  if (missing.length) {
    out.push(issue('warning', 'El montaje está incompleto',
      'Para que el ordenador arranque todavía falta ' + missing.join(', ') + '.'));
  } else {
    out.push(issue('ok', 'No falta ninguna pieza esencial',
      'El montaje tiene todos los componentes mínimos para funcionar.'));
  }
  if (cooler && cpu && cpu.specs.includedCooler) {
    out.push(issue('info', 'Disipador de serie',
      cpu.name + ' ya incluye disipador, así que ' + cooler.name + ' es opcional (aunque suele refrigerar mejor).',
      [cpu.name, cooler.name]));
  }

  // ------------------------------------------------- 2. Procesador ↔ Placa base
  if (cpu && mb) {
    if (cpu.specs.socket !== mb.specs.socket) {
      out.push(issue('error', 'El procesador no encaja en el socket de la placa',
        cpu.name + ' usa socket ' + cpu.specs.socket + ' y ' + mb.name + ' tiene socket ' +
        mb.specs.socket + '. Los pines y el anclaje son físicamente distintos: no entra.',
        [cpu.name, mb.name]));
    } else {
      out.push(issue('ok', 'Procesador y placa base compatibles',
        'Ambos son socket ' + cpu.specs.socket + '.', [cpu.name, mb.name]));
    }
  }

  // ------------------------------------------------------- 3. Memoria RAM
  if (rams.length) {
    const types = [...new Set(rams.map(r => r.specs.memType))];
    if (types.length > 1) {
      out.push(issue('error', 'Has mezclado tipos de memoria distintos',
        'Hay módulos ' + types.join(' y ') + ' en el mismo montaje. Cada generación tiene una muesca ' +
        'en distinta posición y un número de contactos diferente, así que no se pueden combinar.',
        rams.map(r => r.name)));
    }
    if (mb) {
      const bad = rams.filter(r => r.specs.memType !== mb.specs.memType);
      if (bad.length) {
        out.push(issue('error', 'La RAM no es del tipo que admite la placa',
          mb.name + ' sólo acepta ' + mb.specs.memType + ', y has puesto ' +
          [...new Set(bad.map(r => r.specs.memType))].join('/') + '. La muesca de la ranura no coincide.',
          [mb.name, ...bad.map(r => r.name)]));
      } else {
        out.push(issue('ok', 'Tipo de memoria correcto',
          'Los módulos son ' + mb.specs.memType + ', igual que las ranuras de ' + mb.name + '.', [mb.name]));
      }
      if (rams.length > mb.specs.memSlots) {
        out.push(issue('error', 'No hay ranuras de RAM suficientes',
          'Has colocado ' + rams.length + ' módulos y ' + mb.name + ' sólo tiene ' +
          mb.specs.memSlots + ' ranuras DIMM.', [mb.name]));
      }
      const totalGb = rams.reduce((a, r) => a + r.specs.moduleGb, 0);
      if (totalGb > mb.specs.memMaxGb) {
        out.push(issue('error', 'Demasiada memoria para esta placa',
          'Has puesto ' + totalGb + ' GB y ' + mb.name + ' admite como máximo ' + mb.specs.memMaxGb + ' GB.',
          [mb.name]));
      }
      const fastest = Math.max(...rams.map(r => r.specs.speed));
      if (fastest > mb.specs.memMaxSpeed) {
        out.push(issue('warning', 'La RAM es más rápida de lo que soporta la placa',
          'Los módulos son de ' + fastest + ' MHz pero ' + mb.name + ' llega a ' + mb.specs.memMaxSpeed +
          ' MHz. Funcionarán, pero a menor velocidad de la que has pagado.', [mb.name]));
      }
    }
    if (cpu) {
      const bad = rams.filter(r => !cpu.specs.memTypes.includes(r.specs.memType));
      if (bad.length) {
        out.push(issue('error', 'El procesador no soporta ese tipo de memoria',
          cpu.name + ' lleva un controlador de memoria que sólo trabaja con ' +
          cpu.specs.memTypes.join(' o ') + '. El controlador de RAM está dentro de la CPU, no en la placa.',
          [cpu.name, ...bad.map(r => r.name)]));
      }
    }
    if (rams.length === 1) {
      out.push(issue('warning', 'Sólo hay un módulo de RAM (single channel)',
        'Con un único módulo la memoria trabaja en canal simple y pierdes bastante rendimiento. ' +
        'Lo habitual es montar 2 módulos iguales para aprovechar el doble canal.'));
    } else if (rams.length % 2 !== 0) {
      out.push(issue('warning', 'Número impar de módulos de RAM',
        'Con ' + rams.length + ' módulos el doble canal no se aprovecha bien. Usa 2 o 4 módulos iguales.'));
    }
    const totalGb = rams.reduce((a, r) => a + r.specs.moduleGb, 0);
    if (totalGb < 8) {
      out.push(issue('warning', 'Poca memoria RAM',
        'El montaje tiene ' + totalGb + ' GB. Hoy en día 16 GB es lo razonable para un equipo de uso general.'));
    }
  }

  // -------------------------------------------------- 4. Placa base ↔ Caja
  if (mb && box) {
    if (!box.specs.formFactors.includes(mb.specs.formFactor)) {
      out.push(issue('error', 'La placa base no cabe en la caja',
        mb.name + ' es formato ' + mb.specs.formFactor + ' y ' + box.name + ' sólo admite ' +
        box.specs.formFactors.join(', ') + '. Los agujeros de los separadores y el hueco del panel trasero no coinciden.',
        [mb.name, box.name]));
    } else {
      out.push(issue('ok', 'La placa base cabe en la caja',
        box.name + ' admite placas ' + mb.specs.formFactor + '.', [mb.name, box.name]));
    }
  }

  // -------------------------------------------------- 5. Refrigeración
  if (cooler && cpu) {
    if (!cooler.specs.sockets.includes(cpu.specs.socket)) {
      out.push(issue('error', 'El disipador no tiene anclaje para ese socket',
        cooler.name + ' es compatible con ' + cooler.specs.sockets.join(', ') + ', pero ' + cpu.name +
        ' es ' + cpu.specs.socket + '. Los agujeros de sujeción alrededor del socket están a distinta distancia.',
        [cooler.name, cpu.name]));
    } else {
      out.push(issue('ok', 'El disipador encaja en el socket',
        cooler.name + ' incluye anclaje para ' + cpu.specs.socket + '.', [cooler.name, cpu.name]));
    }
    if (cooler.specs.tdpMax < cpu.specs.tdp) {
      out.push(issue('warning', 'El disipador se queda corto para esta CPU',
        cpu.name + ' puede disipar hasta ' + cpu.specs.tdp + ' W y ' + cooler.name + ' está pensado para ' +
        cooler.specs.tdpMax + ' W. La CPU se calentará y bajará su frecuencia (throttling).',
        [cooler.name, cpu.name]));
    }
  }
  if (cooler && box) {
    if (cooler.specs.heightMm && cooler.specs.heightMm > box.specs.maxCoolerHeight) {
      out.push(issue('error', 'El disipador es demasiado alto para la caja',
        cooler.name + ' mide ' + cooler.specs.heightMm + ' mm de alto y en ' + box.name +
        ' caben como máximo ' + box.specs.maxCoolerHeight + ' mm. No podrás cerrar el panel lateral.',
        [cooler.name, box.name]));
    }
    if (cooler.specs.radiator) {
      if (!box.specs.radiators.includes(cooler.specs.radiator)) {
        out.push(issue('error', 'La caja no admite ese radiador',
          cooler.name + ' lleva un radiador de ' + cooler.specs.radiator + ' mm y ' + box.name +
          (box.specs.radiators.length ? ' sólo admite radiadores de ' + box.specs.radiators.join(', ') + ' mm.'
                                      : ' no tiene sitio para radiadores de refrigeración líquida.'),
          [cooler.name, box.name]));
      } else {
        out.push(issue('ok', 'El radiador cabe en la caja',
          box.name + ' admite radiadores de ' + cooler.specs.radiator + ' mm.', [cooler.name, box.name]));
      }
    }
  }
  if (cooler && cooler.specs.ramClearance && rams.length) {
    const tallest = Math.max(...rams.map(r => r.specs.heightMm));
    if (tallest > cooler.specs.ramClearance) {
      out.push(issue('warning', 'El disipador choca con los módulos de RAM',
        cooler.name + ' deja ' + cooler.specs.ramClearance + ' mm libres sobre las ranuras y tus módulos miden ' +
        tallest + ' mm. Tendrías que mover el ventilador del disipador o usar RAM de perfil bajo.',
        [cooler.name]));
    }
  }

  // -------------------------------------------------- 6. Tarjeta gráfica
  if (gpu) {
    if (box && gpu.specs.lengthMm > box.specs.maxGpuLen) {
      out.push(issue('error', 'La tarjeta gráfica no cabe en la caja',
        gpu.name + ' mide ' + gpu.specs.lengthMm + ' mm y en ' + box.name + ' caben ' +
        box.specs.maxGpuLen + ' mm. Chocaría con la jaula de discos o con los ventiladores frontales.',
        [gpu.name, box.name]));
    } else if (box) {
      out.push(issue('ok', 'La tarjeta gráfica cabe en la caja',
        gpu.specs.lengthMm + ' mm de tarjeta para ' + box.specs.maxGpuLen + ' mm disponibles.',
        [gpu.name, box.name]));
    }
    if (mb && mb.specs.pcieX16 < 1) {
      out.push(issue('error', 'La placa no tiene ranura PCIe x16',
        mb.name + ' no dispone de ranura para tarjeta gráfica.', [mb.name, gpu.name]));
    }
    if (mb && parseFloat(gpu.specs.pcieVer) > parseFloat(mb.specs.pcieVer)) {
      out.push(issue('info', 'Versiones de PCIe distintas',
        gpu.name + ' es PCIe ' + gpu.specs.pcieVer + ' y la placa es PCIe ' + mb.specs.pcieVer +
        '. Funciona igualmente porque PCIe es compatible hacia atrás, sólo se reduce el ancho de banda.',
        [gpu.name, mb.name]));
    }
  }

  // ------------------------------------------- 7. ¿Habrá imagen en el monitor?
  if (cpu && !gpu) {
    if (!cpu.specs.igpu) {
      out.push(issue('error', 'No hay salida de vídeo',
        cpu.name + ' no lleva gráfica integrada y no has puesto tarjeta gráfica. El ordenador encendería, ' +
        'pero el monitor se quedaría en negro.', [cpu.name]));
    } else {
      out.push(issue('ok', 'Habrá imagen sin tarjeta gráfica',
        cpu.name + ' incluye ' + cpu.specs.igpu + ', así que puedes usar las salidas de vídeo de la placa.',
        [cpu.name]));
    }
  }

  // -------------------------------------------- 8. Fuente de alimentación
  if (psu) {
    if (box && !box.specs.psuForm.includes(psu.specs.formFactor)) {
      out.push(issue('error', 'La fuente no encaja en la caja',
        psu.name + ' es formato ' + psu.specs.formFactor + ' y ' + box.name + ' necesita una fuente ' +
        box.specs.psuForm.join(' o ') + '.', [psu.name, box.name]));
    }
    if (power.total > 0) {
      if (psu.specs.watts < power.total) {
        out.push(issue('error', 'La fuente no da la potencia necesaria',
          'El montaje puede pedir unos ' + power.total + ' W y la fuente sólo entrega ' + psu.specs.watts +
          ' W. Se apagaría al exigirle carga. Se recomiendan al menos ' + power.recommended + ' W.',
          [psu.name]));
      } else if (psu.specs.watts < power.recommended) {
        out.push(issue('warning', 'La fuente va justa de potencia',
          'Consumo estimado: ' + power.total + ' W. La fuente da ' + psu.specs.watts +
          ' W, pero conviene dejar margen para los picos: se recomiendan ' + power.recommended + ' W.',
          [psu.name]));
      } else {
        out.push(issue('ok', 'Potencia de la fuente suficiente',
          'Consumo estimado ' + power.total + ' W y la fuente entrega ' + psu.specs.watts + ' W.', [psu.name]));
      }
    }
    const p = psu.specs.power || {};
    if (gpu && gpu.specs.power) {
      const need = gpu.specs.power;
      if (need.vhpwr && !p.vhpwr) {
        const equiv = (p.pcie8 || 0) >= 4;
        out.push(issue(equiv ? 'warning' : 'error', 'Falta el conector de alimentación de la gráfica',
          gpu.name + ' necesita un conector 12VHPWR de 16 pines y ' + psu.name + ' no lo tiene.' +
          (equiv ? ' Podrías usar el adaptador de 4 × PCIe 8 pines que incluye la tarjeta, pero no es lo ideal.'
                 : ' Además no tiene suficientes conectores PCIe para usar un adaptador.'),
          [gpu.name, psu.name]));
      }
      if (need.pcie8 && (p.pcie8 || 0) < need.pcie8) {
        out.push(issue('error', 'Faltan conectores PCIe para la gráfica',
          gpu.name + ' necesita ' + need.pcie8 + ' conector(es) PCIe de 8 pines y ' + psu.name +
          ' sólo ofrece ' + (p.pcie8 || 0) + '.', [gpu.name, psu.name]));
      }
      if ((need.pcie8 && (p.pcie8 || 0) >= need.pcie8) || (need.vhpwr && p.vhpwr)) {
        out.push(issue('ok', 'La fuente puede alimentar la gráfica',
          'Tiene los conectores que pide ' + gpu.name + '.', [gpu.name, psu.name]));
      }
    }
    if (mb && (p.eps8 || 0) < mb.specs.eps) {
      out.push(issue('error', 'Faltan conectores EPS para la placa base',
        mb.name + ' necesita ' + mb.specs.eps + ' conector(es) EPS de 8 pines para alimentar la CPU y ' +
        psu.name + ' sólo tiene ' + (p.eps8 || 0) + '.', [mb.name, psu.name]));
    }
    const sataDevices = storages.filter(s => s.specs.kind !== 'nvme').length + (odd ? 1 : 0);
    if (sataDevices > psu.specs.sata) {
      out.push(issue('error', 'Faltan conectores SATA de alimentación',
        'Hay ' + sataDevices + ' dispositivos SATA y ' + psu.name + ' trae ' + psu.specs.sata + ' conectores.',
        [psu.name]));
    }
  }

  // -------------------------------------------------- 9. Almacenamiento
  if (storages.length && mb) {
    const nvme = storages.filter(s => s.specs.kind === 'nvme');
    if (nvme.length > mb.specs.m2Slots) {
      out.push(issue('error', 'No hay ranuras M.2 suficientes',
        'Has puesto ' + nvme.length + ' SSD NVMe y ' + mb.name + ' tiene ' + mb.specs.m2Slots +
        ' ranura(s) M.2.' + (mb.specs.m2Slots === 0 ? ' Esta placa es anterior al estándar M.2.' : ''),
        [mb.name, ...nvme.map(s => s.name)]));
    } else if (nvme.length) {
      out.push(issue('ok', 'Los SSD NVMe caben en las ranuras M.2',
        nvme.length + ' de ' + mb.specs.m2Slots + ' ranuras M.2 ocupadas.', [mb.name]));
    }
    const sata = storages.filter(s => s.specs.kind !== 'nvme').length + (odd ? 1 : 0);
    if (sata > mb.specs.sataPorts) {
      out.push(issue('error', 'No hay puertos SATA suficientes en la placa',
        'Necesitas ' + sata + ' puertos SATA y ' + mb.name + ' tiene ' + mb.specs.sataPorts + '.', [mb.name]));
    }
  }
  if (storages.length && box) {
    const hdd35 = storages.filter(s => s.specs.format === '3,5"').length;
    const ssd25 = storages.filter(s => s.specs.format === '2,5"').length;
    if (hdd35 > box.specs.bays35) {
      out.push(issue('error', 'No hay bahías de 3,5" suficientes',
        'Has puesto ' + hdd35 + ' disco(s) duro de 3,5" y ' + box.name + ' tiene ' + box.specs.bays35 +
        ' bahía(s) de ese tamaño.', [box.name]));
    }
    if (ssd25 > box.specs.bays25) {
      out.push(issue('error', 'No hay bahías de 2,5" suficientes',
        'Has puesto ' + ssd25 + ' SSD de 2,5" y ' + box.name + ' tiene ' + box.specs.bays25 + ' anclaje(s).',
        [box.name]));
    }
  }

  // ---------------------------------------------------- 10. Unidad óptica
  if (odd && box) {
    if (box.specs.bays525 < 1) {
      out.push(issue('error', 'La caja no tiene bahía de 5,25"',
        box.name + ' no tiene hueco frontal para ' + odd.name + '. Las cajas modernas han eliminado ' +
        'esa bahía; la alternativa sería una grabadora externa USB.', [odd.name, box.name]));
    } else {
      out.push(issue('ok', 'La unidad óptica tiene bahía',
        box.name + ' dispone de ' + box.specs.bays525 + ' bahía(s) de 5,25".', [odd.name, box.name]));
    }
  }

  // ----------------------------------------------- 11. Tarjetas de expansión
  if (exps.length && mb) {
    if (exps.length > mb.specs.pcieSmall) {
      out.push(issue('error', 'No hay ranuras PCIe suficientes',
        'Has puesto ' + exps.length + ' tarjeta(s) de expansión y ' + mb.name + ' tiene ' +
        mb.specs.pcieSmall + ' ranura(s) PCIe pequeñas libres.', [mb.name]));
    }
    if (gpu && gpu.specs.slots >= 3) {
      out.push(issue('warning', 'La gráfica tapa ranuras de expansión',
        gpu.name + ' ocupa ' + gpu.specs.slots + ' ranuras de altura, así que cubre las ranuras PCIe ' +
        'que tiene justo debajo. Comprueba que las tarjetas caben.', [gpu.name]));
    }
  }
  if (exps.length && mb && mb.specs.wifi && exps.some(e => e.id === 'exp-wifi6')) {
    out.push(issue('info', 'Wi-Fi duplicado',
      mb.name + ' ya lleva Wi-Fi integrado, la tarjeta inalámbrica no es necesaria.', [mb.name]));
  }

  // ----------------------------------------------------- 12. Ventiladores
  if (box) {
    const used = fans.length + (cooler && cooler.specs.radiator ? cooler.specs.fans : 0);
    if (used > box.specs.fanMounts) {
      out.push(issue('error', 'No hay huecos suficientes para tantos ventiladores',
        'Necesitas ' + used + ' huecos (incluidos los del radiador) y ' + box.name + ' tiene ' +
        box.specs.fanMounts + '.', [box.name]));
    }
    if (fans.length === 0 && !cooler?.specs.radiator) {
      out.push(issue('warning', 'No has puesto ventiladores de caja',
        'Sin flujo de aire el calor se acumula dentro de la torre. Lo mínimo razonable es uno delante ' +
        '(entrada) y uno detrás (salida).'));
    }
  }

  // ------------------------------------------- 13. Detalles de configuración
  if (cpu && mb) {
    const intelK = cpu.brand === 'Intel' && /K$/.test(cpu.name.split(' ')[2] || cpu.name);
    if (intelK && !/^Z/.test(mb.specs.chipset)) {
      out.push(issue('warning', 'No podrás hacer overclock',
        cpu.name + ' tiene el multiplicador desbloqueado, pero el chipset ' + mb.specs.chipset +
        ' no permite overclock. Para eso hace falta un chipset Z.', [cpu.name, mb.name]));
    }
    if (cpu.specs.tdp >= 150 && ['A320', 'H610', 'H110'].includes(mb.specs.chipset)) {
      out.push(issue('warning', 'Placa de gama baja para un procesador potente',
        mb.name + ' tiene una fase de alimentación (VRM) modesta para los ' + cpu.specs.tdp + ' W de ' +
        cpu.name + '. Podría calentarse y limitar el rendimiento.', [cpu.name, mb.name]));
    }
  }

  const errors = out.filter(i => i.level === 'error').length;
  const warnings = out.filter(i => i.level === 'warning').length;
  return { issues: out, errors, warnings, power };
}
