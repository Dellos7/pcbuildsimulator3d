// Pistas progresivas: se muestran después de razonar y pedir la comprobación.
export function learningHint(title) {
  const hints = [
    [/socket|anclaje/, 'Busca el socket de la CPU en su ficha. La placa y el anclaje del disipador deben admitir ese mismo socket. ¿Qué pieza cambiarías para mantener el resto del equipo?'],
    [/RAM|memoria|módulo/, 'Compara la generación DDR, el número de módulos y la capacidad total con la placa y la CPU. ¿Cambiarías los módulos o la placa? Para doble canal, busca dos módulos iguales.'],
    [/pantalla|vídeo|puertos de la placa/, 'Sigue el recorrido: CPU con gráfica integrada → placa → cable → pantalla, o tarjeta gráfica → cable → pantalla. ¿Qué eslabón falta o qué conectores no coinciden?'],
    [/PCIe|ancho de banda/, 'Compara el tamaño del conector de la tarjeta con las ranuras libres. Una tarjeta pequeña puede entrar en una ranura mayor. Comprueba también las líneas eléctricas y las ranuras tapadas por la gráfica.'],
    [/potencia|fuente|EPS|alimentación/, 'Separa dos preguntas: ¿hay vatios suficientes con margen? ¿hay conectores del tipo y cantidad necesarios? Una fuente potente puede carecer del enchufe que necesitas.'],
    [/alto|cabe|radiador|bahía|huecos/, 'Compara las medidas o el número de huecos, no sólo la marca. Cambia la pieza que excede el límite o busca una caja con espacio suficiente. ¿Qué alternativa conserva mejor tu presupuesto?'],
    [/SATA|M\.2/, 'Cada unidad necesita su conexión de datos; los discos SATA también necesitan alimentación. Cuenta puertos y conectores por separado antes de elegir otra placa o fuente.'],
    [/incompleto|Falta/, 'Revisa qué función cumple cada pieza que falta. Añádela y vuelve a comprobar: un montaje completo aún puede tener incompatibilidades.'],
    [/ventiladores/, 'Piensa por dónde entra el aire frío y por dónde sale el caliente. Añade ventilación sin superar los anclajes disponibles de la caja.'],
    [/overclock|gama baja/, 'El socket permite encajar la CPU, pero el chipset y la alimentación condicionan lo que puedes hacer. ¿Necesitas esa función para el uso que has elegido?']
  ];
  return hints.find(([pattern]) => pattern.test(title))?.[1] || 'Revisa las características de las piezas señaladas. Propón un cambio, explica por qué solucionaría el aviso y vuelve a comprobar.';
}
