---
description: Convenciones para Migraciones, Relaciones Eloquent y Base de Datos
globs: ["Enfoca_ProyectoFinal/database/migrations/*.php", "Enfoca_ProyectoFinal/app/Models/*.php"]
---

# Reglas de Base de Datos y Eloquent

1. **Migraciones**:
   - Nombrar las tablas en plural y en minúsculas (ej. `couples`, `love_photos`, `couple_messages`).
   - Las claves foráneas deben utilizar el método `constrained()` de Laravel y aplicar `onDelete('cascade')` cuando la lógica lo exija para evitar registros huérfanos.
2. **Modelos Eloquent**:
   - Definir siempre las propiedades `$fillable` en cada modelo para prevenir asignaciones masivas accidentales (Mass Assignment Vulnerability).
   - Declarar explícitamente las relaciones (`belongsTo`, `hasMany`, `belongsToMany`).
3. **Optimización**:
   - Prevenir problemas de N+1 utilizando Eager Loading (`with('relacion')`) en consultas pesadas o listados.
4. **Timestamps**:
   - Aprovechar los timestamps automáticos de Laravel (`created_at`, `updated_at`).
