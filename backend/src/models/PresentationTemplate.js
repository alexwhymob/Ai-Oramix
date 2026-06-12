import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const presentationTemplateSchema = new mongoose.Schema({
  ...baseFields,
  code: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  active: { type: Boolean, default: true },
  is_default: { type: Boolean, default: false },
  sort_order: { type: Number, default: 0 },
  theme_primary_color: { type: String, default: '#2563EB' },
  theme_secondary_color: { type: String, default: '#0F172A' },
  theme_accent_color: { type: String, default: '#F59E0B' },
  branding_logo_url: { type: String, default: null },
  branding_cover_image_url: { type: String, default: null },
  branding_footer_text: { type: String, default: 'Confidential - Oramix' },
  cover_title_pt: { type: String, default: 'Relatorio Executivo de Maturidade' },
  cover_title_en: { type: String, default: 'Executive Readiness Presentation' },
  cover_subtitle_pt: { type: String, default: 'Resumo executivo da avaliacao' },
  cover_subtitle_en: { type: String, default: 'Executive summary of the assessment' },
  include_summary: { type: Boolean, default: true },
  include_global_score: { type: Boolean, default: true },
  include_pillar_chart: { type: Boolean, default: true },
  include_radar_chart: { type: Boolean, default: true },
  include_quick_wins: { type: Boolean, default: true },
  include_roadmap: { type: Boolean, default: true },
  include_use_cases: { type: Boolean, default: true },
  include_consultant_notes: { type: Boolean, default: false },
  pillar_chart_type: {
    type: String,
    enum: ['bar', 'column'],
    default: 'bar'
  },
  score_chart_type: {
    type: String,
    enum: ['doughnut', 'bar'],
    default: 'doughnut'
  },
  max_summary_bullets: { type: Number, default: 5 },
  max_quick_wins: { type: Number, default: 4 },
  max_use_cases: { type: Number, default: 3 },
  max_consultant_notes: { type: Number, default: 4 }
}, schemaOptions);

presentationTemplateSchema.index({ active: 1, is_default: -1, sort_order: 1 });

touchUpdatedDate(presentationTemplateSchema);

export const PresentationTemplate = mongoose.model('PresentationTemplate', presentationTemplateSchema);
