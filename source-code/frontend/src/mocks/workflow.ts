/**
 * 工作流 Mock 数据
 */

import type { Workflow, WorkflowJsonData } from '@/types/workflow'

export type { Workflow, WorkflowJsonData } from '@/types/workflow'

export const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'SDXL 基础工作流',
    description: '使用 SDXL 模型的基础文生图工作流',
    preview: 'https://via.placeholder.com/300x200',
    nodes: 12,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    tags: ['SDXL', '文生图', '基础']
  },
  {
    id: '2',
    name: 'ControlNet 姿态控制',
    description: '使用 ControlNet OpenPose 进行姿态控制的工作流',
    preview: 'https://via.placeholder.com/300x200',
    nodes: 18,
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-01-18T16:20:00Z',
    tags: ['ControlNet', '姿态控制', '高级']
  },
  {
    id: '3',
    name: 'LoRA 风格化',
    description: '使用多个 LoRA 模型进行风格化处理',
    preview: 'https://via.placeholder.com/300x200',
    nodes: 15,
    createdAt: '2024-01-14T11:30:00Z',
    updatedAt: '2024-01-19T10:15:00Z',
    tags: ['LoRA', '风格化', '中级']
  },
  {
    id: '4',
    name: '图片放大工作流',
    description: '使用 Upscale 模型进行图片放大',
    preview: 'https://via.placeholder.com/300x200',
    nodes: 8,
    createdAt: '2024-01-12T15:00:00Z',
    updatedAt: '2024-01-17T09:45:00Z',
    tags: ['Upscale', '图片处理', '基础']
  },
  {
    id: '5',
    name: 'IP-Adapter 参考图',
    description: '使用 IP-Adapter 进行参考图生成',
    preview: 'https://via.placeholder.com/300x200',
    nodes: 20,
    createdAt: '2024-01-10T13:20:00Z',
    updatedAt: '2024-01-21T11:00:00Z',
    tags: ['IP-Adapter', '参考图', '高级']
  }
]

export const mockWorkflowJson: WorkflowJsonData = {
  "id": "93142890-8f65-43bb-b361-c03b86877175",
  "revision": 0,
  "last_node_id": 267,
  "last_link_id": 518,
  "nodes": [
    {"id":244,"type":"VAEDecode","pos":[900,-610],"size":[295.56664603007357,46],"flags":{},"order":28,"mode":0,"inputs":[{"label":"Latent","localized_name":"Latent","name":"samples","type":"LATENT","link":449},{"label":"VAE","localized_name":"vae","name":"vae","type":"VAE","link":498}],"outputs":[{"label":"图像","localized_name":"图像","name":"IMAGE","type":"IMAGE","links":[455]}],"properties":{"Node name for S&R":"VAEDecode","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[]},
    {"id":167,"type":"SeedVarianceEnhancer","pos":[608.3875377370033,-490.0717431280243],"size":[277.50920476613624,250],"flags":{},"order":23,"mode":0,"inputs":[{"label":"条件输入","localized_name":"conditioning","name":"conditioning","type":"CONDITIONING","link":261},{"label":"随机化百分比","localized_name":"randomize_percent","name":"randomize_percent","type":"FLOAT","widget":{"name":"randomize_percent"},"link":null},{"label":"强度","localized_name":"strength","name":"strength","type":"FLOAT","widget":{"name":"strength"},"link":null},{"label":"噪声插入","localized_name":"noise_insert","name":"noise_insert","type":"COMBO","widget":{"name":"noise_insert"},"link":null},{"label":"步数切换百分比","localized_name":"steps_switchover_percent","name":"steps_switchover_percent","type":"FLOAT","widget":{"name":"steps_switchover_percent"},"link":null},{"label":"随机种子","localized_name":"seed","name":"seed","type":"INT","widget":{"name":"seed"},"link":null},{"label":"遮罩起始位置","localized_name":"mask_starts_at","name":"mask_starts_at","type":"COMBO","widget":{"name":"mask_starts_at"},"link":null},{"label":"遮罩百分比","localized_name":"mask_percent","name":"mask_percent","type":"FLOAT","widget":{"name":"mask_percent"},"link":null},{"label":"输出至控制台","localized_name":"log_to_console","name":"log_to_console","type":"BOOLEAN","widget":{"name":"log_to_console"},"link":null}],"outputs":[{"label":"条件输出","localized_name":"CONDITIONING","name":"CONDITIONING","type":"CONDITIONING","links":[262]}],"properties":{"Node name for S&R":"SeedVarianceEnhancer","cnr_id":"seedvarianceenhancer","ver":"0.5.1"},"widgets_values":[0.2,1,"add",0.5,0,"top",0.5,false]},
    {"id":245,"type":"Image Comparer (rgthree)","pos":[1200,-500],"size":[300,200],"flags":{},"order":29,"mode":0,"inputs":[{"name":"image_a","type":"IMAGE","link":455},{"name":"image_b","type":"IMAGE","link":null}],"outputs":[],"properties":{"Node name for S&R":"Image Comparer (rgthree)","cnr_id":"rgthree-comfy","ver":"0.5.1"},"widgets_values":[]},
    {"id":232,"type":"ModelSamplingAuraFlow","pos":[200,-400],"size":[300,100],"flags":{},"order":12,"mode":0,"inputs":[{"name":"model","type":"MODEL","link":445}],"outputs":[{"name":"MODEL","type":"MODEL","links":[446]}],"properties":{"Node name for S&R":"ModelSamplingAuraFlow","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[1]},
    {"id":38,"type":"CLIPLoader","pos":[-300,-300],"size":[300,100],"flags":{},"order":1,"mode":0,"inputs":[],"outputs":[{"name":"CLIP","type":"CLIP","links":[443,444]}],"properties":{"Node name for S&R":"CLIPLoader","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":["clip_l.safetensors","flux"]},
    {"id":141,"type":"ConditioningZeroOut","pos":[100,-200],"size":[300,50],"flags":{},"order":20,"mode":0,"inputs":[{"name":"conditioning","type":"CONDITIONING","link":262}],"outputs":[{"name":"CONDITIONING","type":"CONDITIONING","links":[263]}],"properties":{"Node name for S&R":"ConditioningZeroOut","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[]},
    {"id":241,"type":"LoraLoaderModelOnly","pos":[-100,-500],"size":[300,100],"flags":{},"order":11,"mode":0,"inputs":[{"name":"model","type":"MODEL","link":442}],"outputs":[{"name":"MODEL","type":"MODEL","links":[445]}],"properties":{"Node name for S&R":"LoraLoaderModelOnly","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":["flux_realism_lora.safetensors",1]},
    {"id":221,"type":"EmptyLatentImage","pos":[400,-700],"size":[300,100],"flags":{},"order":13,"mode":0,"inputs":[],"outputs":[{"name":"LATENT","type":"LATENT","links":[448]}],"properties":{"Node name for S&R":"EmptyLatentImage","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[1024,1024,1]},
    {"id":248,"type":"KSampler","pos":[700,-400],"size":[300,200],"flags":{},"order":26,"mode":0,"inputs":[{"name":"model","type":"MODEL","link":446},{"name":"positive","type":"CONDITIONING","link":263},{"name":"negative","type":"CONDITIONING","link":264},{"name":"latent_image","type":"LATENT","link":448}],"outputs":[{"name":"LATENT","type":"LATENT","links":[449]}],"properties":{"Node name for S&R":"KSampler","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[123456789,"fixed",20,1,"euler","simple",1]},
    {"id":247,"type":"CLIPTextEncode","pos":[200,-100],"size":[300,100],"flags":{},"order":21,"mode":0,"inputs":[{"name":"clip","type":"CLIP","link":443}],"outputs":[{"name":"CONDITIONING","type":"CONDITIONING","links":[261]}],"properties":{"Node name for S&R":"CLIPTextEncode","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":["a beautiful landscape, masterpiece, best quality"]},
    {"id":6,"type":"CLIPTextEncode","pos":[200,50],"size":[300,100],"flags":{},"order":22,"mode":0,"inputs":[{"name":"clip","type":"CLIP","link":444}],"outputs":[{"name":"CONDITIONING","type":"CONDITIONING","links":[265]}],"properties":{"Node name for S&R":"CLIPTextEncode","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[""]},
    {"id":224,"type":"UNETLoader","pos":[-300,-500],"size":[300,100],"flags":{},"order":0,"mode":0,"inputs":[],"outputs":[{"name":"MODEL","type":"MODEL","links":[442]}],"properties":{"Node name for S&R":"UNETLoader","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":["flux1-dev.safetensors","flux"]},
    {"id":165,"type":"VAELoader_Any","pos":[600,-700],"size":[300,100],"flags":{},"order":2,"mode":0,"inputs":[],"outputs":[{"name":"VAE","type":"VAE","links":[498]}],"properties":{"Node name for S&R":"VAELoader_Any","cnr_id":"loaderutils","ver":"0.5.1"},"widgets_values":["ae.safetensors"]},
    {"id":250,"type":"CivitaiGalleryNode","pos":[1200,-200],"size":[300,200],"flags":{},"order":30,"mode":0,"inputs":[{"name":"image","type":"IMAGE","link":null}],"outputs":[],"properties":{"Node name for S&R":"CivitaiGalleryNode","cnr_id":"ComfyUI_Civitai_Gallery","ver":"0.5.1"},"widgets_values":[]},
    {"id":253,"type":"PrimitiveStringMultiline","pos":[-100,100],"size":[300,150],"flags":{},"order":3,"mode":0,"inputs":[],"outputs":[{"name":"STRING","type":"STRING","links":[456]}],"properties":{"Node name for S&R":"PrimitiveStringMultiline","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":["a beautiful landscape, masterpiece, best quality"]},
    {"id":254,"type":"JoinStringMulti","pos":[100,300],"size":[300,100],"flags":{},"order":24,"mode":0,"inputs":[{"name":"string1","type":"STRING","link":456},{"name":"string2","type":"STRING","link":457}],"outputs":[{"name":"STRING","type":"STRING","links":[458]}],"properties":{"Node name for S&R":"JoinStringMulti","cnr_id":"comfyui-kjnodes","ver":"0.5.1"},"widgets_values":[]},
    {"id":251,"type":"ShowText|pysssss","pos":[400,300],"size":[300,100],"flags":{},"order":25,"mode":0,"inputs":[{"name":"text","type":"STRING","link":458}],"outputs":[],"properties":{"Node name for S&R":"ShowText|pysssss","cnr_id":"comfyui-custom-scripts","ver":"0.5.1"},"widgets_values":[]},
    {"id":265,"type":"PromptExpand","pos":[-100,400],"size":[300,150],"flags":{},"order":4,"mode":0,"inputs":[],"outputs":[{"name":"STRING","type":"STRING","links":[457]}],"properties":{"Node name for S&R":"PromptExpand","cnr_id":"prompt-assistant","ver":"0.5.1"},"widgets_values":["enhance prompt",0.8]},
    {"id":246,"type":"CLIPLoader","pos":[-300,-100],"size":[300,100],"flags":{},"order":5,"mode":0,"inputs":[],"outputs":[{"name":"CLIP","type":"CLIP","links":[]}],"properties":{"Node name for S&R":"CLIPLoader","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":["t5xxl_fp16.safetensors","flux"]},
    {"id":249,"type":"VAEDecode","pos":[1000,-300],"size":[300,50],"flags":{},"order":27,"mode":0,"inputs":[{"name":"samples","type":"LATENT","link":null},{"name":"vae","type":"VAE","link":null}],"outputs":[{"name":"IMAGE","type":"IMAGE","links":[]}],"properties":{"Node name for S&R":"VAEDecode","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[]},
    {"id":243,"type":"KSampler","pos":[700,-100],"size":[300,200],"flags":{},"order":19,"mode":0,"inputs":[{"name":"model","type":"MODEL","link":null},{"name":"positive","type":"CONDITIONING","link":null},{"name":"negative","type":"CONDITIONING","link":null},{"name":"latent_image","type":"LATENT","link":null}],"outputs":[{"name":"LATENT","type":"LATENT","links":[]}],"properties":{"Node name for S&R":"KSampler","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[987654321,"random",25,2,"dpmpp_2m","normal",1]},
    {"id":259,"type":"SeedVarianceEnhancer","pos":[400,0],"size":[277.50920476613624,250],"flags":{},"order":14,"mode":0,"inputs":[{"label":"条件输入","localized_name":"conditioning","name":"conditioning","type":"CONDITIONING","link":265}],"outputs":[{"label":"条件输出","localized_name":"CONDITIONING","name":"CONDITIONING","type":"CONDITIONING","links":[264]}],"properties":{"Node name for S&R":"SeedVarianceEnhancer","cnr_id":"seedvarianceenhancer","ver":"0.5.1"},"widgets_values":[0.3,0.8,"add",0.6,1,"bottom",0.3,true]},
    {"id":260,"type":"ConditioningZeroOut","pos":[600,100],"size":[300,50],"flags":{},"order":18,"mode":0,"inputs":[{"name":"conditioning","type":"CONDITIONING","link":null}],"outputs":[{"name":"CONDITIONING","type":"CONDITIONING","links":[]}],"properties":{"Node name for S&R":"ConditioningZeroOut","cnr_id":"comfy-core","ver":"0.5.1"},"widgets_values":[]},
    {"id":263,"type":"Reroute","pos":[500,-350],"size":[75,26],"flags":{},"order":15,"mode":0,"inputs":[{"name":"","type":"*","link":446}],"outputs":[{"name":"","type":"*","links":[447]}],"properties":{},"widgets_values":[]},
    {"id":261,"type":"Reroute","pos":[550,-250],"size":[75,26],"flags":{},"order":16,"mode":0,"inputs":[{"name":"","type":"*","link":262}],"outputs":[{"name":"","type":"*","links":[263]}],"properties":{},"widgets_values":[]},
    {"id":262,"type":"Reroute","pos":[550,-150],"size":[75,26],"flags":{},"order":17,"mode":0,"inputs":[{"name":"","type":"*","link":264}],"outputs":[{"name":"","type":"*","links":[]}],"properties":{},"widgets_values":[]},
    {"id":256,"type":"Reroute","pos":[600,-450],"size":[75,26],"flags":{},"order":6,"mode":0,"inputs":[{"name":"","type":"*","link":448}],"outputs":[{"name":"","type":"*","links":[]}],"properties":{},"widgets_values":[]},
    {"id":266,"type":"Reroute","pos":[650,-550],"size":[75,26],"flags":{},"order":7,"mode":0,"inputs":[{"name":"","type":"*","link":498}],"outputs":[{"name":"","type":"*","links":[]}],"properties":{},"widgets_values":[]},
    {"id":258,"type":"ImageBridgeX","pos":[1100,-650],"size":[300,200],"flags":{},"order":31,"mode":0,"inputs":[{"name":"images","type":"IMAGE","link":455},{"name":"image","type":"STRING","widget":{"name":"image"}}],"outputs":[{"name":"IMAGE","type":"IMAGE","links":[]},{"name":"MASK","type":"MASK","links":[]}],"properties":{},"widgets_values":["",false,"never"]},
    {"id":192,"type":"ImageBridgeX","pos":[1100,-400],"size":[300,200],"flags":{},"order":32,"mode":0,"inputs":[{"name":"images","type":"IMAGE","link":null},{"name":"image","type":"STRING","widget":{"name":"image"}}],"outputs":[{"name":"IMAGE","type":"IMAGE","links":[]},{"name":"MASK","type":"MASK","links":[]}],"properties":{},"widgets_values":["",false,"never"]},
    {"id":264,"type":"ShowText|pysssss","pos":[700,300],"size":[300,100],"flags":{},"order":8,"mode":0,"inputs":[{"name":"text","type":"STRING","link":null}],"outputs":[],"properties":{"Node name for S&R":"ShowText|pysssss","cnr_id":"comfyui-custom-scripts","ver":"0.5.1"},"widgets_values":[]},
    {"id":267,"type":"ShowText|pysssss","pos":[700,450],"size":[300,100],"flags":{},"order":9,"mode":0,"inputs":[{"name":"text","type":"STRING","link":null}],"outputs":[],"properties":{"Node name for S&R":"ShowText|pysssss","cnr_id":"comfyui-custom-scripts","ver":"0.5.1"},"widgets_values":[]}
  ],
  "links": [
    [261,6,0,167,0,"CONDITIONING"],
    [266,6,0,141,0,"CONDITIONING"],
    [284,38,0,6,0,"CLIP"],
    [410,224,0,232,0,"MODEL"],
    [441,232,0,241,0,"MODEL"],
    [446,167,0,243,1,"CONDITIONING"],
    [447,141,0,243,2,"CONDITIONING"],
    [449,243,0,244,0,"LATENT"],
    [455,244,0,192,0,"IMAGE"],
    [456,246,0,247,0,"CLIP"],
    [462,248,0,249,0,"LATENT"],
    [464,192,0,245,0,"IMAGE"],
    [487,249,0,258,0,"IMAGE"],
    [488,258,0,245,1,"IMAGE"],
    [489,247,0,259,0,"CONDITIONING"],
    [490,259,0,248,1,"CONDITIONING"],
    [491,247,0,260,0,"CONDITIONING"],
    [492,260,0,248,2,"CONDITIONING"],
    [493,241,0,261,0,"MODEL"],
    [494,261,0,248,0,"MODEL"],
    [495,261,0,243,0,"MODEL"],
    [496,165,0,262,0,"VAE"],
    [497,262,0,249,1,"VAE"],
    [498,262,0,244,1,"VAE"],
    [499,221,0,263,0,"LATENT"],
    [500,263,0,248,3,"LATENT"],
    [501,263,0,243,3,"LATENT"],
    [507,256,0,264,0,"STRING"],
    [508,253,0,254,0,"STRING"],
    [509,250,0,254,1,"STRING"],
    [510,256,0,247,1,"STRING"],
    [511,256,0,6,1,"STRING"],
    [513,254,0,265,0,"STRING"],
    [515,266,0,251,0,"STRING"],
    [516,266,0,256,0,"STRING"],
    [517,265,0,266,0,"STRING"],
    [518,254,0,267,0,"STRING"]
  ]
}

export const workflowWithJson: Workflow = {
  id: 'demo-1',
  name: 'Z-IMAGE 文生图',
  description: 'Flux 模型文生图工作流，包含 SeedVarianceEnhancer、rgthree 图像对比等高级节点',
  preview: undefined,
  nodes: mockWorkflowJson.nodes.length,
  createdAt: '2024-03-14T10:00:00Z',
  updatedAt: '2024-03-14T14:30:00Z',
  tags: ['Flux', '文生图', '高级'],
  rawData: mockWorkflowJson
}
