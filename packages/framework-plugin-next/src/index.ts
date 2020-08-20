import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

import { Plugin, PluginServiceApi } from "@cloudbase/framework-core";
import { plugin as FunctionPlugin } from "@cloudbase/framework-plugin-function";
import { NextBuilder } from "@cloudbase/next-builder";

class NextPlugin extends Plugin {
  protected resolvedInputs: any;
  protected buildOutput: any;
  protected builder: NextBuilder;
  protected functionPlugin: any;

  constructor(
    public name: string,
    public api: PluginServiceApi,
    public inputs: any
  ) {
    super(name, api, inputs);

    const DEFAULT_INPUTS = {
      runtime: "Nodejs10.15",
      entry: "./",
      name: "next-ssr",
      path: "/next-ssr",
      buildCommand: "npm run build",
    };

    this.resolvedInputs = resolveInputs(this.inputs, DEFAULT_INPUTS);

    this.builder = new NextBuilder({
      projectPath: this.api.projectPath,
    });
  }

  /**
   * 初始化
   */
  async init() {
    this.api.logger.debug("NextPlugin: init", this.resolvedInputs);

    if (fs.existsSync("package.json")) {
      this.api.logger.info("npm install");
      return promisify(exec)("npm install");
    }
  }

  async compile() {
    this.api.logger.debug("NextPlugin: compile", this.resolvedInputs);

    return this.functionPlugin.compile();
  }

  /**
   * 执行本地命令
   */
  async run() {}

  /**
   * 删除资源
   */
  async remove() {}

  /**
   * 生成代码
   */
  async genCode() {}

  /**
   * 构建
   */
  async build() {
    this.api.logger.debug("NextPlugin: build", this.resolvedInputs);

    const { buildCommand } = this.resolvedInputs;

    if (buildCommand) {
      await promisify(exec)(buildCommand);
    }

    this.buildOutput = await this.builder.build(this.resolvedInputs.entry, {
      name: this.resolvedInputs.name,
      path: this.resolvedInputs.path,
    });

    const srcFunction = this.buildOutput.functions[0];

    this.functionPlugin = new FunctionPlugin("function", this.api, {
      functionRootPath: srcFunction.source,
      functions: [
        {
          name: srcFunction.name,
          handler: srcFunction.entry,
          runtime: this.resolvedInputs.runtime,
          installDependency: true,
        },
      ],
      servicePaths: {
        [this.resolvedInputs.name]: this.resolvedInputs.path,
      },
    });
  }

  /**
   * 部署
   */
  async deploy() {
    this.api.logger.debug(
      "NextPlugin: deploy",
      this.resolvedInputs,
      this.buildOutput
    );

    await this.functionPlugin.deploy();

    await this.builder.clean();

    this.api.logger.info(`🚀 Next 应用部署成功`);
  }
}

function resolveInputs(inputs: any, defaultInputs: any) {
  return Object.assign({}, defaultInputs, inputs);
}

export const plugin = NextPlugin;
