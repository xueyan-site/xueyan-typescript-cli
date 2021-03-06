import ora from 'ora'
import chardet from 'chardet'
import { template } from 'lodash'
import { existsSync } from 'fs-extra'
import Project, { ProjectConfig } from './project'
import Executor, { ExecutorProps } from './executor'
import { cmdPath } from 'utils/path'
import { deepCopy } from 'utils/write'
import { executeSync } from 'utils/exec'

/**
 * 项目创建器实例化参数
 */
export interface ProjectCreatorProps<
  TProject extends Project<string, ProjectConfig<string>>
> extends ExecutorProps<TProject> {
  /**
   * 实例化项目时，使用的模版名称
   */
  template?: string
}

/**
 * 项目创建器
 */
export default abstract class ProjectCreator<
  TProject extends Project<string, ProjectConfig<string>>
> extends Executor<TProject> {
  protected templatePath: string

  constructor(props: ProjectCreatorProps<TProject>, defaultTemplate: string) {
    super(props)
    const __template__ = props.template || defaultTemplate
    this.templatePath = cmdPath(`tmp/${__template__}`)
  }

  /**
   * 复制项目代码
   */
  protected async generateProject() {
    if (existsSync(this.project.path)) {
      throw new Error(`project ${this.project.name} is already exists`)
    }
    const copyOra = ora('copying project template').start()
    await deepCopy(
      this.templatePath,
      this.project.path,
      {
        handler: (_node, content) => {
          const encodeInfo = chardet.analyse(content)
          if(encodeInfo.find(i => i.name === 'UTF-8')) {
            const compiled = template(content.toString('utf8'), {
              interpolate: /<%=([\s\S]+?)%>/g
            })
            return compiled(this.project)
          }
          return content
        }
      }
    )
    copyOra.succeed('copy project template successfully')
  }

  /**
   * 下载node_modules
   */
  protected downloadProjectModules() {
    const downloadOra = ora('downloading node modules').start()
    executeSync(`cd ${this.project.path} && yarn`)
    downloadOra.succeed(`downloaded node modules successfully`)
  }
  
  /**
   * 下载 doc node_modules
   */
  protected downloadDocumentModules() {
    const docPath = this.project.withPath('doc')
    if (existsSync(docPath)) {
      const downloadDocOra = ora('downloading doc node modules').start()
      executeSync(`cd ${docPath} && yarn`)
      downloadDocOra.succeed(`downloaded doc node modules successfully`)
    }
  }
  
  /**
   * 初始化git仓库
   */
  protected initializeGitRepository() {
    const gitPath = this.project.withPath('.git')
    if (!existsSync(gitPath)) {
      const initGitOra = ora('initializing git repository').start()
      executeSync(`cd ${this.project.path} && git init && git add . && git commit -m "chore: project created"`)
      initGitOra.succeed(`initialized git repository successfully`)
    }
  }
}
