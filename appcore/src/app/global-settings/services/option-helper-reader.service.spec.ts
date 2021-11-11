import { TestBed } from "@angular/core/testing";
import { OptionHelperReaderService } from "./option-helper-reader.service";
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { of } from "rxjs";

describe("OptionHelperReaderService", () => {
  let http: HttpClient;
  let optionHelperReaderService: OptionHelperReaderService;

  beforeEach(done => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [OptionHelperReaderService, HttpClient]
    });

    http = TestBed.inject(HttpClient);
    optionHelperReaderService = TestBed.inject(OptionHelperReaderService);
    done();
  });

  it("should be created", done => {
    expect(optionHelperReaderService).not.toBeNull();
    expect(http).not.toBeNull();
    done();
  });

  it("should return markdown data", done => {
    // Given
    const markDownData = "## **This Title has bold style**";

    spyOn(http, "get").and.returnValue(of(markDownData));

    // When
    const promise = optionHelperReaderService.get("test.md");

    // Then
    promise.then((markDownResultData: string) => {
      expect(markDownResultData).not.toBeNull();
      expect(markDownResultData).toBe(markDownData);
      done();
    });
  });
});
