import { randomUUID } from 'node:crypto';

export const baseFields = {
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => randomUUID()
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  updated_date: {
    type: Date,
    default: Date.now
  },
  created_by_id: {
    type: String,
    default: null
  }
};

export const schemaOptions = {
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret._id;
      return ret;
    }
  }
};

export function touchUpdatedDate(schema) {
  schema.pre('save', function updateTimestamp(next) {
    this.updated_date = new Date();
    next();
  });

  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function updateQueryTimestamp(next) {
    this.set({ updated_date: new Date() });
    next();
  });
}
