import { Document, Model, model, Schema } from 'mongoose';

export interface IConfig {
  code: string;
  value: string;
}

export interface IConfigDocument extends IConfig, Document {}

export const configsSchema = new Schema({
  code: { type: String },
  value: { type: String },
});

export interface IConfigModel extends Model<IConfigDocument> {
  updateConfig(doc: IConfig): Promise<IConfigDocument>;
  getConfigs(): Promise<{ accessKeyId: string; secretAccessKey: string; region: string }>;
}

export const loadClass = () => {
  class Config {
    /**
     * Updates config
     */
    public static async updateConfig(doc: { accessKeyId: string; secretAccessKey: string; region: string }) {
      const options = { upsert: true, new: true, setDefaultsOnInsert: true };

      await Configs.updateOne({ code: 'accessKeyId' }, { $set: { value: doc.accessKeyId } }, options);
      await Configs.updateOne({ code: 'secretAccessKey' }, { $set: { value: doc.secretAccessKey } }, options);
      await Configs.updateOne({ code: 'region' }, { $set: { value: doc.region } }, options);

      return this.getConfigs();
    }

    public static async getConfigs() {
      const accessKeyId = await Configs.findOne({ code: 'accessKeyId' });
      const secretAccessKey = await Configs.findOne({ code: 'secretAccessKey' });
      const region = await Configs.findOne({ code: 'region' });

      return {
        accessKeyId: accessKeyId.value || '',
        region: region.value || '',
        secretAccessKey: secretAccessKey.value || '',
      };
    }
  }

  configsSchema.loadClass(Config);

  return configsSchema;
};

loadClass();

// tslint:disable-next-line
const Configs = model<IConfigDocument, IConfigModel>('configs', configsSchema);

export default Configs;
